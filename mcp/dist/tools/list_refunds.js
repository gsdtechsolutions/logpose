import { z } from "zod";
import { getRefunds } from "../lib/api.js";
const tool = {
    name: "list_refunds",
    description: "Lists refunds and chargebacks with optional filters. " +
        "Returns customer details, refund amounts, reasons, platform, and dates. " +
        "Use this to analyze churn, identify problematic products, or monitor refund rate trends.",
    inputSchema: z.object({
        preset: z
            .enum(["today", "yesterday", "7d", "30d", "90d", "custom"])
            .optional()
            .describe("Time preset. Default: '30d'."),
        start_date: z.string().optional().describe("YYYY-MM-DD. Required when preset='custom'."),
        end_date: z.string().optional().describe("YYYY-MM-DD. Required when preset='custom'."),
        status: z
            .enum(["refunded", "chargeback"])
            .optional()
            .describe("Filter by refund type."),
        platform: z.enum(["kiwify", "payt", "api"]).optional().describe("Filter by platform."),
        search: z.string().optional().describe("Search by customer email or product name."),
        account_slug: z.string().optional().describe("Filter by webhook account slug."),
        page: z.number().int().min(1).optional().describe("Page number. Default: 1."),
        per_page: z.number().int().min(1).max(200).optional().describe("Items per page. Max: 200."),
    }),
    handler: async (args) => {
        try {
            const params = {
                preset: args.preset,
                start_date: args.start_date,
                end_date: args.end_date,
                status: args.status,
                platform: args.platform,
                search: args.search,
                account_slug: args.account_slug,
                page: args.page,
                per_page: args.per_page,
            };
            const data = await getRefunds(params);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        catch (error) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error listing refunds: ${msg}` }] };
        }
    },
};
export default tool;
//# sourceMappingURL=list_refunds.js.map