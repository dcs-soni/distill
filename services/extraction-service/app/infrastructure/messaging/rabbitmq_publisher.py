import os
import json
import uuid
from datetime import datetime, timezone
import aio_pika
import structlog

logger = structlog.get_logger("extraction-service")

class RabbitMQPublisher:
    def __init__(self):
        self.rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
        self.exchange_name = "extraction.exchange"
        self.connection = None
        self.channel = None
        self.exchange = None

    async def connect(self):
        logger.info("Connecting to RabbitMQ for publishing", url=self.rabbitmq_url)
        self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            self.exchange_name, 
            aio_pika.ExchangeType.TOPIC, 
            durable=True
        )
        logger.info("Publisher connected to RabbitMQ")

    async def close(self):
        if self.connection:
            await self.connection.close()

    async def publish_extraction_completed(
        self, tenant_id: str, document_id: str, extraction_id: str, confidence_score: float, provider: str
    ):
        if not self.exchange:
            await self.connect()

        routing_key = "extraction.completed"
        
        event_payload = {
            "eventId": str(uuid.uuid4()),
            "eventType": "ExtractionCompletedEvent",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tenantId": tenant_id,
            "payload": {
                "documentId": document_id,
                "extractionId": extraction_id,
                "status": "SUCCESS",
                "confidenceScore": confidence_score,
                "providerUsed": provider
            }
        }

        message = aio_pika.Message(
            body=json.dumps(event_payload).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json",
            timestamp=datetime.now(timezone.utc)
        )

        logger.info("Publishing ExtractionCompletedEvent", document_id=document_id, extraction_id=extraction_id)
        await self.exchange.publish(message, routing_key=routing_key)
