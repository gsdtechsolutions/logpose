import getDashboardOverviewTool from "./get_dashboard_overview.js";
import listSalesTool from "./list_sales.js";
import getSalesSummaryTool from "./get_sales_summary.js";
import listRefundsTool from "./list_refunds.js";
import listRecoveryTool from "./list_recovery.js";
import listCampaignsTool from "./list_campaigns.js";
import getCampaignsSummaryTool from "./get_campaigns_summary.js";
import getDbSchemaTool from "./get_db_schema.js";
import runDbQueryTool from "./run_db_query.js";

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    handler: (args: any) => Promise<{ content: { type: "text"; text: string }[] }>;
}

export const tools: ToolDefinition[] = [
    getDashboardOverviewTool,
    listSalesTool,
    getSalesSummaryTool,
    listRefundsTool,
    listRecoveryTool,
    listCampaignsTool,
    getCampaignsSummaryTool,
    getDbSchemaTool,
    runDbQueryTool,
];
