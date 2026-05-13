CREATE TABLE IF NOT EXISTS facebook_ads_cache (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR NOT NULL,
    date_preset VARCHAR NOT NULL,
    campaigns_data JSONB DEFAULT '[]'::jsonb,
    adsets_data JSONB DEFAULT '[]'::jsonb,
    ads_data JSONB DEFAULT '[]'::jsonb,
    summary_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_facebook_ads_cache_account_id ON facebook_ads_cache (account_id);
CREATE INDEX IF NOT EXISTS ix_facebook_ads_cache_date_preset ON facebook_ads_cache (date_preset);
