import logging
import uuid
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.infrastructure.ai.provider_factory import ProviderFactory
from app.agents.classifier import DocumentClassifierAgent
from app.agents.section_finder import SectionFinderAgent
from app.agents.extractor import DataExtractionAgent
from app.agents.normalizer import NormalizationAgent
from app.agents.pipeline import ExtractionPipeline
from app.infrastructure.storage.s3_client import S3Client
from app.infrastructure.messaging.rabbitmq_publisher import RabbitMQPublisher
from app.infrastructure.messaging.rabbitmq_consumer import RabbitMQConsumer

logger = logging.getLogger("extraction-service")

consumer_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Extraction Service starting up...")
    
    # Initialize dependencies
    provider_factory = ProviderFactory()
    classifier = DocumentClassifierAgent(provider_factory)
    section_finder = SectionFinderAgent(provider_factory)
    extractor = DataExtractionAgent(provider_factory)
    normalizer = NormalizationAgent()
    
    pipeline = ExtractionPipeline(
        classifier=classifier,
        section_finder=section_finder,
        extractor=extractor,
        normalizer=normalizer
    )
    
    s3_client = S3Client()
    
    publisher = RabbitMQPublisher()
    await publisher.connect()
    
    consumer = RabbitMQConsumer(s3_client, pipeline, publisher)
    
    # Start consumer in background
    global consumer_task
    consumer_task = asyncio.create_task(consumer.start_consuming())
    
    yield
    
    logger.info("Extraction Service shutting down...")
    
    if consumer_task:
        consumer_task.cancel()
        
    await consumer.close()
    await publisher.close()

app = FastAPI(
    title="Extraction Service",
    description="Multi-agent AI financial data extraction service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID Middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Prometheus instrumentation
Instrumentator().instrument(app).expose(app)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/ready")
async def readiness_check():
    return {"status": "ready"}
