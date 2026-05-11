import { z } from "zod";
import { getRecovery } from "../lib/api.js";
import { ToolDefinition } from "./index.js";

const tool: ToolDefinition = {
    name: "list_recovery",
    description:
        "Lists recovery items (abandoned carts, PIX pending, unidentified) with their recovery status. " +
        "Returns channel (WhatsApp, email, SMS, etc.), amount, customer info, and recovery outcome. " +
        "Use this to measure recovery campaign effectiveness and spot high-value recovery opportunities.",
    inputSchema: z.object({
        preset: z
            .enum(["today", "yesterday", "7d", "30d", "90d", "custom"])
            .optional()
            .describe("Time preset. Default: '30d'."),
        date_start: z.string().optional().describe("YYYY-MM-DD. Required when preset='custom'."),
        date_end: z.string().optional().describe("YYYY-MM-DD. Required when preset='custom'."),
        status_filter: z
            .enum(["all", "pending", "recovered"])
            .optional()
            .describe("Filter by recovery status. Default: 'all'."),
        type_filter: z
            .enum(["all", "abandoned_cart", "pix_pending", "unidentified"])
            .optional()
            .describe("Filter by recovery type. Default: 'all'."),
        channel_filter: z
            .enum(["all", "whatsapp", "email", "sms", "back_redirect", "other"])
            .optional()
            .describe("Filter by recovery channel. Default: 'all'."),
        page: z.number().int().min(1).optional().describe("Page number. Default: 1."),
        per_page: z.number().int().min(1).max(200).optional().describe("Items per page. Default: 50."),
    }),
    handler: async (args) => {
        try {
            const params: Record<string, string | number | undefined> = {
                preset: args.preset,
                date_start: args.date_start,
                date_end: args.date_end,
                status_filter: args.status_filter,
                type_filter: args.type_filter,
                channel_filter: args.channel_filter,
                page: args.page,
                per_page: args.per_page,
            };
            const data = await getRecovery(params);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error listing recovery items: ${msg}` }] };
        }
    },
};

export default tool;
