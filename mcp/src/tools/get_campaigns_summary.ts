import { z } from "zod";
import { getCampaignsSummary } from "../lib/api.js";
import { ToolDefinition } from "./index.js";

const tool: ToolDefinition = {
    name: "get_campaigns_summary",
    description:
        "Returns an aggregated summary of all campaigns grouped by UTM campaign name. " +
        "Shows total sales count and total revenue per campaign, sorted by highest revenue. " +
        "Use this to quickly rank campaigns by profitability without Facebook Ads data.",
    inputSchema: z.object({
        date_start: z.string().describe("Start date in YYYY-MM-DD format (required)."),
        date_end: z.string().describe("End date in YYYY-MM-DD format (required)."),
    }),
    handler: async (args) => {
        try {
            const params: Record<string, string | undefined> = {
                date_start: args.date_start,
                date_end: args.date_end,
            };
            const data = await getCampaignsSummary(params);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error fetching campaigns summary: ${msg}` }] };
        }
    },
};

export default tool;
