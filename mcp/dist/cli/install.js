import fs from "fs";
import path from "path";
import os from "os";
// Clients that store MCP config as JSON (mcpServers key)
// NOTE: Codex uses TOML (~/.codex/config.toml) and its own CLI.
//       Use: codex mcp add logpose -- npx -y logpose-mcp --api-key <key> --base-url <url>
const CLIENTS = {
    claude: {
        label: "Claude Code",
        configPath: path.join(os.homedir(), ".claude", "mcp.json"),
    },
    gemini: {
        label: "Gemini CLI",
        configPath: path.join(os.homedir(), ".gemini", "settings.json"),
    },
    cursor: {
        label: "Cursor",
        configPath: path.join(os.homedir(), ".cursor", "mcp.json"),
    },
};
function buildEntry(apiKey, baseUrl) {
    return {
        command: "npx",
        args: ["-y", "logpose-mcp", "--api-key", apiKey, "--base-url", baseUrl],
    };
}
function readJson(filePath) {
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function writeJson(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + "\n", "utf-8");
}
export function runInstall(clientId, apiKey, baseUrl) {
    // Codex uses its own CLI and TOML config — not supported here
    if (clientId === "codex") {
        console.error(`\n⚠️   O Codex CLI usa TOML e tem sua própria CLI para adicionar MCPs.`);
        console.error(`   Use este comando no terminal:\n`);
        console.error(`   codex mcp add logpose -- npx -y logpose-mcp --api-key ${apiKey} --base-url ${baseUrl}\n`);
        process.exit(1);
    }
    const client = CLIENTS[clientId];
    if (!client) {
        console.error(`\n❌  Cliente desconhecido: "${clientId}"`);
        console.error(`   Valores aceitos: claude, gemini, cursor\n`);
        process.exit(1);
    }
    const existing = readJson(client.configPath);
    // Ensure mcpServers key exists
    if (!existing.mcpServers || typeof existing.mcpServers !== "object") {
        existing.mcpServers = {};
    }
    const alreadyExists = !!existing.mcpServers.logpose;
    existing.mcpServers.logpose = buildEntry(apiKey, baseUrl);
    writeJson(client.configPath, existing);
    const action = alreadyExists ? "atualizado" : "adicionado";
    console.log(`\n✅  Log Pose MCP ${action} com sucesso!`);
    console.log(`   Cliente : ${client.label}`);
    console.log(`   Arquivo : ${client.configPath}`);
    console.log(`   API Key : ${apiKey.slice(0, 10)}...`);
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`\n   Reinicie o ${client.label} para ativar o MCP.\n`);
}
//# sourceMappingURL=install.js.map