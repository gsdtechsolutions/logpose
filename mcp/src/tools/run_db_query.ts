import { z } from "zod";
import { runDbQuery } from "../lib/api.js";
import { ToolDefinition } from "./index.js";

const SAFETY_NOTE = `
IMPORTANT SAFETY RULES:
- Only SELECT statements are accepted. INSERT, UPDATE, DELETE, DROP, ALTER, etc. are blocked server-side.
- Always call 'get_db_schema' first to understand the table and column names before writing a query.
- Use LIMIT to avoid returning huge result sets (e.g., LIMIT 100).
- The database is PostgreSQL 14.
`;

const tool: ToolDefinition = {
    name: "run_db_query",
    description:
        "Executes a read-only (SELECT) SQL query against the Log Pose PostgreSQL database and returns results. " +
        "This is the most powerful tool for advanced analysis: custom aggregations, cohort analysis, " +
        "cross-table joins, or any question not covered by other tools. " +
        "ALWAYS call 'get_db_schema' first if you are unsure about table/column names. " +
        "Only SELECT is allowed — write operations are blocked server-side.",
    inputSchema: z.object({
        sql: z
            .string()
            .describe(
                "A valid PostgreSQL SELECT statement. " +
                "Start with SELECT. Do not use INSERT, UPDATE, DELETE, DROP, ALTER, etc. " +
                "Use LIMIT to cap the result set."
            ),
    }),
    handler: async (args) => {
        try {
            const data = await runDbQuery(args.sql);
            const result = {
                ...data,
                _safety_note: SAFETY_NOTE.trim(),
            };
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error running query: ${msg}` }] };
        }
    },
};

export default tool;
