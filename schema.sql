-- n8n MCP SaaS Platform - Database Schema
-- For Cloudflare D1

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,  -- NULL for OAuth users
    oauth_provider TEXT,  -- 'github', 'google', or NULL for email/password
    oauth_id TEXT,  -- Provider's user ID
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',  -- active, suspended, deleted
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- n8n Connections Table
-- ============================================
CREATE TABLE IF NOT EXISTS n8n_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    n8n_url TEXT NOT NULL,
    n8n_api_key_encrypted TEXT NOT NULL,
    status TEXT DEFAULT 'active',  -- active, inactive, error
    last_tested_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- API Keys Table
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,  -- First 8 chars for display (e.g., "saas_abc...")
    name TEXT DEFAULT 'Default',
    status TEXT DEFAULT 'active',  -- active, revoked
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connection_id) REFERENCES n8n_connections(id) ON DELETE CASCADE
);

-- ============================================
-- Usage Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS usage_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    api_key_id TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    status TEXT NOT NULL,  -- success, error, rate_limited
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Monthly Usage Summary Table
-- ============================================
CREATE TABLE IF NOT EXISTS usage_monthly (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    year_month TEXT NOT NULL,  -- Format: '2024-01'
    request_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, year_month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Plans Table
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    monthly_request_limit INTEGER NOT NULL,
    max_connections INTEGER NOT NULL,
    price_monthly REAL NOT NULL,
    features TEXT,  -- JSON string
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Insert Default Plans
-- ============================================
INSERT OR IGNORE INTO plans (id, name, monthly_request_limit, max_connections, price_monthly, features) VALUES
    ('free', 'Free', 100, 1, 0, '{"support": "community", "analytics": false}'),
    ('starter', 'Starter', 1000, 3, 9.99, '{"support": "email", "analytics": true}'),
    ('pro', 'Pro', 10000, 10, 29.99, '{"support": "priority", "analytics": true}'),
    ('enterprise', 'Enterprise', 100000, -1, 99.99, '{"support": "dedicated", "analytics": true, "sla": true}');

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

CREATE INDEX IF NOT EXISTS idx_n8n_connections_user ON n8n_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_n8n_connections_status ON n8n_connections(status);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_connection ON api_keys(connection_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key ON usage_logs(api_key_id);

CREATE INDEX IF NOT EXISTS idx_usage_monthly_user ON usage_monthly(user_id, year_month);
