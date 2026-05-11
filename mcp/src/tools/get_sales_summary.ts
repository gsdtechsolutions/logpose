import { z } from "zod";
import { getSalesSummary } from "../lib/api.js";
import { ToolDefinition } from "./index.js";

const tool: ToolDefinition = {
    name: "get_sales_summary",
    description:
        "Returns aggregated KPIs for sales in the given period: " +
        "total transactions, approved count, refund count, chargeback count, pending count, " +
        "total revenue, and average ticket. " +
        "Use this when you need a quick financial snapshot without individual records.",
    inputSchema: z.object({
        preset: z
            .enum(["today", "yesterday", "7d", "30d", "90d", "custom"])
            .optional()
            .describe("Time preset. Default: '30d'."),
        start_date: z.string().optional().describe("YYYY-MM-DD. Required when preset='custom'."),
        end_date: z.string().optional().describe("YYYY-MM-DD. Required when preset='custom'."),
        platform: z.enum(["kiwify", "payt", "api"]).optional().describe("Filter by platform."),
        campaign: z.string().optional().describe("Filter by UTM campaign."),
        account_slug: z.string().optional().describe("Filter by webhook account slug."),
    }),
    handler: async (args) => {
        try {
            const params: Record<string, string | undefined> = {
                preset: args.preset,
                start_date: args.start_date,
                end_date: args.end_date,
                platform: args.platform,
                campaign: args.campaign,
                account_slug: args.account_slug,
            };
            const data = await getSalesSummary(params);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error fetching sales summary: ${msg}` }] };
        }
    },
};

export default tool;
