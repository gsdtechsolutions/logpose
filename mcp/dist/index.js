#!/usr/bin/env node
// ── Install subcommand ────────────────────────────────────────────────────────
// When the user runs: npx -y logpose-mcp install --client <id> --api-key <key> --base-url <url>
// We run the installer instead of starting the MCP server.
if (process.argv[2] === "install") {
    const { Command } = await import("commander");
    const { runInstall } = await import("./cli/install.js");
    const installCmd = new Command()
        .name("logpose-mcp install")
        .description("Installs Log Pose MCP config into your AI client config file")
        .requiredOption("--client <id>", "AI client: claude | gemini | cursor | codex")
        .requiredOption("--api-key <key>", "Your Log Pose API Key (starts with lp_)")
        .requiredOption("--base-url <url>", "Base URL of your Log Pose instance")
        .parse(process.argv.slice(1)); // slice to make commander see 'install' as the program
    const opts = installCmd.opts();
    runInstall(opts.client, opts.apiKey, opts.baseUrl);
    process.exit(0);
}
// ── MCP Server ────────────────────────────────────────────────────────────────
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Command } from "commander";
import { setApiKey, setBaseUrl } from "./lib/state.js";
import { tools } from "./tools/index.js";
const program = new Command()
    .name("logpose-mcp")
    .description("Log Pose MCP — AI access to your Direct Response dashboard")
    .option("--api-key <key>", "Log Pose API Key (starts with lp_)")
    .option("--base-url <url>", "Base URL of your Log Pose instance (e.g., https://dashboard.mysite.com)")
    .allowUnknownOption()
    .parse(process.argv);
const cliOptions = program.opts();
const resolvedApiKey = cliOptions.apiKey || process.env.LOGPOSE_API_KEY;
if (resolvedApiKey)
    setApiKey(resolvedApiKey);
const resolvedBaseUrl = cliOptions.baseUrl || process.env.LOGPOSE_BASE_URL;
if (resolvedBaseUrl)
    setBaseUrl(resolvedBaseUrl);
const server = new McpServer({ name: "Log Pose MCP", version: "1.0.1" }, {
    instructions: `You are an expert Direct Response marketing analyst with full read access to a Log Pose dashboard.

## About Log Pose
Log Pose is a CEO dashboard for Direct Response operations. It integrates:
- Payment platforms (Kiwify, PayT) via webhooks — stored in PostgreSQL
- Facebook Ads metrics (spend, impressions, clicks, ROAS, ROI)
- Recovery campaigns (abandoned cart, PIX pending)
- Refund and chargeback tracking

## Available Tools
1. **get_dashboard_overview** — Full KPI snapshot (revenue, ROAS, ROI, refund rate, top campaigns). Start here.
2. **list_sales** — Paginated transaction list with filters (status, platform, campaign, email search).
3. **get_sales_summary** — Aggregated KPIs: total, approved, refunded, chargebacks, avg ticket.
4. **list_refunds** — Refunds and chargebacks with reasons and customer details.
5. **list_recovery** — Recovery pipeline: abandoned carts, PIX pending, and recovered sales.
6. **list_campaigns** — Facebook Ads campaigns cross-referenced with sales data (ROAS, profit, spend).
7. **get_campaigns_summary** — Revenue ranking by UTM campaign name (no Meta API required).
8. **get_db_schema** — Full PostgreSQL schema for writing custom queries.
9. **run_db_query** — Execute any read-only SELECT for advanced custom analysis.

## Best Practices
- Start with get_dashboard_overview to get the big picture before drilling down.
- Use presets like '7d', '30d', '90d' for time ranges when possible.
- For custom queries, always call get_db_schema first to understand column names.
- ROAS = Revenue / Ad Spend. ROI = (Revenue - Cost) / Cost × 100.
- All monetary values are in BRL. Dates follow YYYY-MM-DD format.`,
});
for (const tool of tools) {
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.inputSchema }, tool.handler);
}
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Log Pose MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map