import os
import json
import uuid
import asyncio
import structlog
import aio_pika

from app.infrastructure.storage.s3_client import S3Client
from app.agents.pipeline import ExtractionPipeline
from app.infrastructure.persistence.sqlalchemy_repo import ExtractionRepository
from app.infrastructure.messaging.rabbitmq_publisher import RabbitMQPublisher
from app.infrastructure.persistence.database import AsyncSessionLocal
from app.domain.entities.extraction import Extraction

logger = structlog.get_logger("extraction-service")

class RabbitMQConsumer:
    def __init__(
        self,
        s3_client: S3Client,
        pipeline: ExtractionPipeline,
        publisher: RabbitMQPublisher
    ):
        self.rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
        self.queue_name = "extraction.document.uploaded"
        self.s3_client = s3_client
        self.pipeline = pipeline
        self.publisher = publisher
        self.connection = None
        self.channel = None

    async def connect(self):
        logger.info("Connecting to RabbitMQ for consumption", url=self.rabbitmq_url)
        self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
        self.channel = await self.connection.channel()
        await self.channel.set_qos(prefetch_count=5)
        logger.info("Consumer connected to RabbitMQ")

    async def start_consuming(self):
        if not self.channel:
            await self.connect()

        queue = await self.channel.declare_queue(
            self.queue_name, 
            durable=True, 
            arguments={
                "x-dead-letter-exchange": "dlx.exchange",
                "x-dead-letter-routing-key": "dead.extraction.document.uploaded"
            }
        )

        logger.info("Starting consumption from queue", queue=self.queue_name)
        await queue.consume(self.process_message)

    async def close(self):
        if self.connection:
            await self.connection.close()

    async def process_message(self, message: aio_pika.abc.AbstractIncomingMessage):
        async with message.process(requeue=False, ignore_processed=True):
            try:
                body = json.loads(message.body.decode())
                logger.info("Received message", event_id=body.get("eventId"))
                
                tenant_id = body.get("tenantId")
                payload = body.get("payload", {})
                document_id = payload.get("documentId")
                s3_key = payload.get("s3Key")
                
                if not all([tenant_id, document_id, s3_key]):
                    logger.error("Missing required fields in event", payload=payload)
                    await message.reject(requeue=False)
                    return
                
                pdf_bytes = await self.s3_client.download_file(s3_key)
                
                extraction_result = await self.pipeline.process(pdf_bytes)
                
                provider = "gemini"
                if hasattr(extraction_result, "metadata") and "provider_used" in extraction_result.metadata:
                    provider = extraction_result.metadata["provider_used"]

                extraction_id = str(uuid.uuid4())
                
                async with AsyncSessionLocal() as session:
                    repo = ExtractionRepository(session)
                    
                    extraction = Extraction(
                        id=extraction_id,
                        tenant_id=tenant_id,
                        document_id=document_id,
                        version=1,
                        confidence=extraction_result.overall_confidence,
                        provider_used=provider,
                        model_used="gemini-2.5-pro",
                        prompt_version="v1",
                        processing_time_ms=0,
                        token_count=0,
                        cost_usd=0.0
                    )
                    
                    if hasattr(extraction_result, "model_dump"):
                        data_dict = extraction_result.model_dump()
                    elif hasattr(extraction_result, "dict"):
                        data_dict = extraction_result.dict()
                    else:
                        data_dict = extraction_result.__dict__
                        
                    await repo.save(extraction, data=data_dict)
                    
                await self.publisher.publish_extraction_completed(
                    tenant_id=tenant_id,
                    document_id=document_id,
                    extraction_id=extraction_id,
                    confidence_score=extraction_result.overall_confidence,
                    provider=provider
                )
                
                await message.ack()
                logger.info("Message processed successfully", document_id=document_id)
                
            except Exception as e:
                logger.error("Error processing message", error=str(e), exc_info=True)
                
                retries = 0
                if message.headers and "x-death" in message.headers:
                    x_death = message.headers.get("x-death", [])
                    if isinstance(x_death, list) and len(x_death) > 0:
                        retries = x_death[0].get("count", 0)
                
                if retries >= 2:
                    logger.error("Message exceeded max retries. Sending to permanent DLQ.", message_id=message.message_id)
                    await message.reject(requeue=False)
                else:
                    logger.warning("Message failed. Rejecting to DLX for retry.", retries=retries+1)
                    await message.reject(requeue=False)
