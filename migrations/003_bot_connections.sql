-- Bot Connections: Multi-tenant Telegram/LINE bot storage
CREATE TABLE IF NOT EXISTS bot_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'My Bot',
    bot_token_encrypted TEXT NOT NULL,
    channel_secret_encrypted TEXT,
    ai_connection_id TEXT NOT NULL,
    mcp_api_key_encrypted TEXT NOT NULL,
    webhook_active INTEGER DEFAULT 0,
    webhook_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ai_connection_id) REFERENCES ai_connections(id)
);

CREATE INDEX IF NOT EXISTS idx_bot_connections_user ON bot_connections(user_id);
