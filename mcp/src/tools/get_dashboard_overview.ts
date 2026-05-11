import { z } from "zod";
import { getDashboardOverview } from "../lib/api.js";
import { ToolDefinition } from "./index.js";

const tool: ToolDefinition = {
    name: "get_dashboard_overview",
    description:
        "Returns a full dashboard overview for the given period: KPIs (revenue, sales, ROI, ROAS, refund rate), " +
        "daily revenue chart data, platform distribution, top campaigns, and hourly sales heatmap. " +
        "Use this as the first call to understand the operation's financial health at a glance.",
    inputSchema: z.object({
        preset: z
            .enum(["today", "yesterday", "7d", "30d", "90d", "custom"])
            .optional()
            .describe("Time preset. Default: '30d'. Use 'custom' with start_date + end_date."),
        start_date: z
            .string()
            .optional()
            .describe("Start date (YYYY-MM-DD). Required when preset='custom'."),
        end_date: z
            .string()
            .optional()
            .describe("End date (YYYY-MM-DD). Required when preset='custom'."),
        platform: z
            .enum(["kiwify", "payt", "api"])
            .optional()
            .describe("Filter by payment platform."),
        account_slug: z
            .string()
            .optional()
            .describe("Filter by webhook account slug."),
    }),
    handler: async (args) => {
        try {
            const params: Record<string, string | undefined> = {
                preset: args.preset,
                start_date: args.start_date,
                end_date: args.end_date,
                platform: args.platform,
                account_slug: args.account_slug,
            };
            const data = await getDashboardOverview(params);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error fetching dashboard overview: ${msg}` }] };
        }
    },
};

export default tool;
