import os
import mimetypes
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/webp", ".webp")

from database.core.connection import engine, Base
from database.core.migrate import run_enum_migrations
from database.core.migrate_sql import run_sql_migrations

from api.auth.setup import router as setup_router
from api.auth.login import router as login_router
from api.auth.profile import router as profile_router
from api.company.settings import router as company_router
from api.company.dashboard import router as company_dash_router
from api.vturb.accounts import router as vturb_router
from api.facebook.accounts import router as facebook_router
from api.facebook.discover import router as facebook_discover_router
from api.facebook.proxy import router as facebook_proxy_router
from api.facebook.backfill import router as facebook_backfill_router
from api.platforms.webhooks import router as platforms_router
from api.products.crud import router as products_router
from api.products.items import router as product_items_router
from api.products.stats import router as product_stats_router
from api.products.aliases import router as product_aliases_router
from api.funnel.data import router as funnel_router
from api.funnel.recovery_data import router as funnel_recovery_router
from api.sales.transactions import router as sales_router
from api.sales.delete import router as sales_delete_router
from api.customers.list import router as customers_router
from api.customers.filter_options import router as customers_filter_options_router
from api.recovery.config import router as recovery_config_router
from api.recovery.list import router as recovery_list_router
from api.dashboard.overview import router as dashboard_router
from api.campaigns.list import router as campaigns_data_router
from api.campaigns.toggle import router as campaigns_toggle_router
from api.campaigns.budget import router as campaigns_budget_router
from api.campaigns.presets import router as campaigns_presets_router
from api.campaigns.tags import router as campaigns_tags_router
from api.campaigns.markers import router as campaigns_markers_router
from api.campaigns.filters import router as campaigns_filters_router
from api.campaigns.conversion import router as campaigns_conversion_router
from api.campaigns.ai_action import router as campaigns_ai_action_router
from api.campaigns.export_details import router as campaigns_export_details_router
from api.ads.list import router as ads_data_router
from api.ads.toggle import router as ads_toggle_router
from api.webhook.receive import router as webhook_receiver_router
from api.csv_import.preview import router as import_preview_router
from api.csv_import.execute import router as import_execute_router
from api.refunds.list import router as refunds_list_router
from api.refunds.reasons import router as refunds_reasons_router
from api.vturb.players import router as vturb_players_router
from api.gemini.accounts import router as gemini_accounts_router
from api.gemini.models import router as gemini_models_router
from api.gemini.chat import router as gemini_chat_router
from api.gemini.daily_report import router as gemini_daily_report_router
from api.ai.training_level import router as ai_training_router
from api.ai.activities import router as ai_activities_router
from api.campaigns_create.fetch_data import router as campaign_create_fetch_router
from api.campaigns_create.create import router as campaign_create_router
from api.campaigns_create.export_import import router as campaign_create_export_router
from api.users.list import router as users_list_router
from api.users.invite import router as users_invite_router
from api.users.manage import router as users_manage_router
from api.stripe.accounts import router as stripe_accounts_router
from api.subscriptions.metrics import router as subscriptions_metrics_router
from api.advanced_settings.features import router as advanced_settings_router
from api.advanced_settings.reset_sales import router as reset_sales_router
from api.mcp.api_key import router as mcp_api_key_router
from api.mcp.ext_dashboard import router as ext_dashboard_router
from api.mcp.ext_campaigns import router as ext_campaigns_router
from api.mcp.ext_data import router as ext_data_router
from api.mcp.ext_database import router as ext_database_router

try:
    run_enum_migrations(engine)
except Exception as e:
    print(f"Warning: run_enum_migrations failed: {e}")

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Base.metadata.create_all failed: {e}")

try:
    run_sql_migrations()
except Exception as e:
    print(f"Warning: run_sql_migrations failed: {e}")

app = FastAPI(title="ConvergeAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ROUTERS = [
    setup_router, login_router, company_router, company_dash_router,
    profile_router, vturb_router, facebook_router, facebook_discover_router,
    facebook_proxy_router, facebook_backfill_router, platforms_router,
    products_router, product_items_router, product_stats_router,
    product_aliases_router, funnel_router, funnel_recovery_router,
    sales_router, sales_delete_router, customers_router,
    customers_filter_options_router, recovery_config_router,
    dashboard_router, recovery_list_router, campaigns_data_router,
    campaigns_toggle_router, campaigns_budget_router, campaigns_presets_router,
    campaigns_tags_router, campaigns_markers_router, campaigns_filters_router,
    campaigns_conversion_router, campaigns_ai_action_router,
    campaigns_export_details_router, ads_data_router, ads_toggle_router,
    webhook_receiver_router, import_preview_router, import_execute_router,
    refunds_list_router, refunds_reasons_router, vturb_players_router,
    gemini_accounts_router, gemini_models_router, gemini_chat_router,
    gemini_daily_report_router, ai_training_router, ai_activities_router,
    campaign_create_fetch_router, campaign_create_router,
    campaign_create_export_router, users_list_router, users_invite_router,
    users_manage_router, stripe_accounts_router,
    subscriptions_metrics_router, advanced_settings_router,
    reset_sales_router, mcp_api_key_router, ext_dashboard_router,
    ext_campaigns_router, ext_data_router, ext_database_router,
]

for r in _ROUTERS:
    app.include_router(r, prefix="/api")

_frontend_dir = os.path.join(os.path.dirname(__file__), "frontend_dist")
if os.path.isdir(_frontend_dir):
    class SPAMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            path = request.url.path
            if path.startswith("/api") or path.startswith("/assets"):
                return await call_next(request)
            if request.method != "GET":
                return await call_next(request)
            if path != "/":
                clean_path = path.lstrip("/")
                file_path = os.path.join(_frontend_dir, clean_path)
                if os.path.isfile(file_path):
                    content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
                    return FileResponse(file_path, media_type=content_type)
            return FileResponse(os.path.join(_frontend_dir, "index.html"))

    app.add_middleware(SPAMiddleware)
    _assets_dir = os.path.join(_frontend_dir, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="frontend-assets")
