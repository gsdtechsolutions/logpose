-- Novas tabelas para armazenamento daily (time_increment=1)
-- Substitui a abordagem JSONB (facebook_ads_cache) por rows normalizados

CREATE TABLE IF NOT EXISTS facebook_daily_campaigns (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'paused',
    objective VARCHAR(100) NOT NULL DEFAULT '',
    bid_strategy VARCHAR(100) NOT NULL DEFAULT 'volume',
    budget FLOAT NOT NULL DEFAULT 0.0,
    spend FLOAT NOT NULL DEFAULT 0.0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    cpc FLOAT NOT NULL DEFAULT 0.0,
    ctr FLOAT NOT NULL DEFAULT 0.0,
    landing_page_views INTEGER NOT NULL DEFAULT 0,
    initiate_checkout INTEGER NOT NULL DEFAULT 0,
    connect_rate FLOAT NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_daily_campaign UNIQUE (account_id, campaign_id, date)
);

CREATE INDEX IF NOT EXISTS ix_fdc_account_date ON facebook_daily_campaigns (account_id, date);

CREATE TABLE IF NOT EXISTS facebook_daily_adsets (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    adset_id VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'paused',
    budget FLOAT NOT NULL DEFAULT 0.0,
    spend FLOAT NOT NULL DEFAULT 0.0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    cpc FLOAT NOT NULL DEFAULT 0.0,
    ctr FLOAT NOT NULL DEFAULT 0.0,
    landing_page_views INTEGER NOT NULL DEFAULT 0,
    initiate_checkout INTEGER NOT NULL DEFAULT 0,
    connect_rate FLOAT NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_daily_adset UNIQUE (account_id, adset_id, date)
);

CREATE INDEX IF NOT EXISTS ix_fda_account_date ON facebook_daily_adsets (account_id, date);

CREATE TABLE IF NOT EXISTS facebook_daily_ads (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(100) NOT NULL,
    ad_id VARCHAR(100) NOT NULL,
    adset_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'paused',
    spend FLOAT NOT NULL DEFAULT 0.0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    cpc FLOAT NOT NULL DEFAULT 0.0,
    ctr FLOAT NOT NULL DEFAULT 0.0,
    landing_page_views INTEGER NOT NULL DEFAULT 0,
    initiate_checkout INTEGER NOT NULL DEFAULT 0,
    connect_rate FLOAT NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_daily_ad UNIQUE (account_id, ad_id, date)
);

CREATE INDEX IF NOT EXISTS ix_fdad_account_date ON facebook_daily_ads (account_id, date);
