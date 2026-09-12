-- Migration para suporte às plataformas Hubla e Cakto
ALTER TYPE webhookplatform ADD VALUE IF NOT EXISTS 'HUBLA';
ALTER TYPE paymentplatform ADD VALUE IF NOT EXISTS 'HUBLA';
ALTER TYPE checkoutplatform ADD VALUE IF NOT EXISTS 'HUBLA';

ALTER TYPE webhookplatform ADD VALUE IF NOT EXISTS 'CAKTO';
ALTER TYPE paymentplatform ADD VALUE IF NOT EXISTS 'CAKTO';
ALTER TYPE checkoutplatform ADD VALUE IF NOT EXISTS 'CAKTO';
