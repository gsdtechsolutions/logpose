# Publicar Log Pose MCP no NPM

## Pré-requisitos

- Node.js 20+
- Conta no NPM com permissão para publicar o pacote
- Autenticado: `npm login`

---

## Publicar (primeira vez ou atualização)

```bash
# Dentro da pasta mcp/

# 1. Instalar dependências
npm install

# 2. Incrementar versão (patch: 1.0.0 → 1.0.1)
npm version patch --no-git-tag-version

# 3. Compilar TypeScript → JavaScript
npm run build

# 4. Publicar no NPM (público)
npm publish --access public
```

---

## Como o usuário instala

Após publicado, o usuário obtém o JSON de configuração ou roda 1 comando.

### Claude Code (`~/claude/mcp.json` ou `~/.claude/mcp.json`)

```json
{
  "mcpServers": {
    "logpose": {
      "command": "npx",
      "args": [
        "-y",
        "logpose-mcp",
        "--api-key",
        "lp_SUA_API_KEY",
        "--base-url",
        "https://SEU_DOMINIO_LOGPOSE"
      ]
    }
  }
}
```

### Gemini (`~/.gemini/settings.json`)

```json
{
  "mcpServers": {
    "logpose": {
      "command": "npx",
      "args": [
        "-y",
        "logpose-mcp",
        "--api-key",
        "lp_SUA_API_KEY",
        "--base-url",
        "https://SEU_DOMINIO_LOGPOSE"
      ]
    }
  }
}
```

### Cursor / Codex / outros clientes MCP

Mesmo JSON acima, ajuste o caminho conforme o cliente.

---

## Variáveis de ambiente (alternativa ao --api-key e --base-url)

```bash
export LOGPOSE_API_KEY="lp_SUA_API_KEY"
export LOGPOSE_BASE_URL="https://SEU_DOMINIO_LOGPOSE"
```

---

## Como gerar a API Key

1. Acesse o Log Pose → **Configurações → MCP / API**
2. Clique em **Gerar chave**
3. Copie a chave `lp_...` (ela só é exibida uma vez)

---

## Estrutura de endpoints consumidos

O MCP faz chamadas para `BASE_URL/api/external/...` usando o header `X-API-Key`.

| Tool | Endpoint |
|---|---|
| `get_dashboard_overview` | `GET /api/external/dashboard/overview` |
| `list_sales` | `GET /api/external/sales` |
| `get_sales_summary` | `GET /api/external/sales/summary` |
| `list_refunds` | `GET /api/external/refunds` |
| `list_recovery` | `GET /api/external/recovery` |
| `list_campaigns` | `GET /api/external/campaigns/data` |
| `get_campaigns_summary` | `GET /api/external/campaigns/summary` |
| `get_db_schema` | `GET /api/external/db/schema` |
| `run_db_query` | `POST /api/external/db/query` |
