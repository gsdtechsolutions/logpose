import { z } from "zod";
import { getSales } from "../lib/api.js";
const tool = {
    name: "list_sales",
    description: "Lists paginated sales transactions with optional filters. " +
        "Returns customer details, transaction amounts, UTM data, platform source, and status. " +
        "Use this to drill into individual sales, search by customer email, or filter by campaign.",
    inputSchema: z.object({
        preset: z
            .enum(["today", "yesterday", "7d", "30d", "90d", "custom"])
            .optional()
            .describe("Time preset. Default: '30d'."),
        start_date: z.string().optional().describe("YYYY-MM-DD. Required when preset='custom'."),
        end_date: z.string().optional().describe("YYYY-MM-DD. Required when preset='custom'."),
        status: z
            .enum(["approved", "refunded", "chargeback", "pending", "trial"])
            .optional()
            .describe("Filter by transaction status."),
        platform: z
            .enum(["kiwify", "payt", "api"])
            .optional()
            .describe("Filter by payment platform."),
        campaign: z
            .string()
            .optional()
            .describe("Filter by UTM campaign name (partial match)."),
        search: z.string().optional().describe("Search by customer email."),
        page: z.number().int().min(1).optional().describe("Page number. Default: 1."),
        per_page: z.number().int().min(1).max(200).optional().describe("Items per page. Max: 200. Default: 50."),
    }),
    handler: async (args) => {
        try {
            const params = {
                preset: args.preset,
                start_date: args.start_date,
                end_date: args.end_date,
                status: args.status,
                platform: args.platform,
                campaign: args.campaign,
                search: args.search,
                page: args.page,
                per_page: args.per_page,
            };
            const data = await getSales(params);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        catch (error) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error listing sales: ${msg}` }] };
        }
    },
};
export default tool;
//# sourceMappingURL=list_sales.js.map