import os
from celery import Celery
from celery.schedules import crontab

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "logpose_worker",
    broker=redis_url,
    backend=redis_url,
    include=["jobs.sync_facebook", "jobs.sync_facebook_backfill"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=False,
)

# Beat schedule desativado: sincronização é feita sob demanda (Lazy Sync)
celery_app.conf.beat_schedule = {}

