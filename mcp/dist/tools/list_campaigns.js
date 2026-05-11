import { z } from "zod";
import { getCampaignsData } from "../lib/api.js";
const tool = {
    name: "list_campaigns",
    description: "Lists Facebook Ads campaigns with cross-referenced sales data. " +
        "Returns spend, impressions, clicks, CTR, CPM, CPC, ROAS, revenue, and profit for each campaign. " +
        "Use this to identify the best-performing campaigns, ad sets, and ads for the operation. " +
        "WARNING: This requires a valid Facebook account connected in Log Pose.",
    inputSchema: z.object({
        date_start: z
            .string()
            .describe("Start date in YYYY-MM-DD format (required)."),
        date_end: z
            .string()
            .describe("End date in YYYY-MM-DD format (required)."),
        account_id: z
            .number()
            .int()
            .optional()
            .describe("Log Pose internal Facebook account ID. Omit to use the first valid account."),
        status_filter: z
            .enum(["ACTIVE", "PAUSED", "ARCHIVED"])
            .optional()
            .describe("Filter campaigns by status."),
    }),
    handler: async (args) => {
        try {
            const params = {
                date_start: args.date_start,
                date_end: args.date_end,
                account_id: args.account_id,
                status_filter: args.status_filter,
            };
            const data = await getCampaignsData(params);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        catch (error) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error listing campaigns: ${msg}` }] };
        }
    },
};
export default tool;
//# sourceMappingURL=list_campaigns.js.map