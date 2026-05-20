import os
import aioboto3
import structlog

logger = structlog.get_logger("extraction-service")

class S3Client:
    def __init__(self):
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL") # pragma: allowlist secret
        self.access_key = os.getenv("S3_ACCESS_KEY") or os.getenv("MINIO_ROOT_USER")  # pragma: allowlist secret
        self.secret_key = os.getenv("S3_SECRET_KEY") or os.getenv("MINIO_ROOT_PASSWORD")  # pragma: allowlist secret
        self.region = os.getenv("S3_REGION", "us-east-1") # pragma: allowlist secret
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "distill-documents") # pragma: allowlist secret
        
        self.session = aioboto3.Session(
            aws_access_key_id=self.access_key,  # pragma: allowlist secret
            aws_secret_access_key=self.secret_key,  # pragma: allowlist secret
            region_name=self.region # pragma: allowlist secret
        )

    async def download_file(self, s3_key: str) -> bytes:
        logger.info("Downloading file from S3", bucket=self.bucket_name, key=s3_key)
        try:
            async with self.session.client("s3", endpoint_url=self.endpoint_url) as s3:
                response = await s3.get_object(Bucket=self.bucket_name, Key=s3_key)
                content = await response['Body'].read()
                logger.info("Successfully downloaded file", bytes=len(content))
                return content
        except Exception as e:
            logger.error("Failed to download file from S3", error=str(e), exc_info=True)
            raise
