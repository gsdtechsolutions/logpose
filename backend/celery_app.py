import os
from celery import Celery
from celery.schedules import crontab

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "logpose_worker",
    broker=redis_url,
    backend=redis_url,
    include=["jobs.sync_facebook"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=False,
)

# Configura o cron para rodar a cada 10 minutos
celery_app.conf.beat_schedule = {
    "sync-facebook-ads-every-10-mins": {
        "task": "jobs.sync_facebook.sync_all_facebook_accounts",
        "schedule": crontab(minute="*/10"),
    },
}
