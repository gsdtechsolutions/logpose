import { z } from "zod";
import { getDbSchema } from "../lib/api.js";
import { ToolDefinition } from "./index.js";

const tool: ToolDefinition = {
    name: "get_db_schema",
    description:
        "Returns the complete database schema: all tables, their columns (name, type, nullable, primary_key), " +
        "and foreign key relationships. " +
        "Use this BEFORE running a custom SQL query to understand the data model and write correct queries.",
    inputSchema: z.object({}),
    handler: async () => {
        try {
            const data = await getDbSchema();
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } catch (error: any) {
            const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return { content: [{ type: "text", text: `Error fetching DB schema: ${msg}` }] };
        }
    },
};

export default tool;
