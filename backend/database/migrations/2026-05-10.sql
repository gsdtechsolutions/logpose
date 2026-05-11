-- Tabela de configuração de proxy para Meta API
CREATE TABLE IF NOT EXISTS proxy_settings (
    id SERIAL PRIMARY KEY,
    proxy_url VARCHAR(500) NOT NULL,
    proxy_type VARCHAR(10) NOT NULL DEFAULT 'http',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    facebook_account_id INTEGER REFERENCES facebook_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de API Keys para acesso externo / MCP
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);
