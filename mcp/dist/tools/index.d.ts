export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    handler: (args: any) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
}
export declare const tools: ToolDefinition[];
//# sourceMappingURL=index.d.ts.map