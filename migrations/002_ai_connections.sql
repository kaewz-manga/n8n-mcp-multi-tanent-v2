-- AI Connections: store customer AI provider credentials (BYOK)
CREATE TABLE IF NOT EXISTS ai_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Default AI',
    provider_url TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    model_name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_connections_user ON ai_connections(user_id);
