-- Platform-wide statistics (permanent counters, never decremented)
CREATE TABLE IF NOT EXISTS platform_stats (
  key TEXT PRIMARY KEY,
  value INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed from existing data
INSERT OR IGNORE INTO platform_stats (key, value) VALUES
  ('total_users', (SELECT COUNT(*) FROM users)),
  ('total_executions', (SELECT COALESCE(SUM(request_count), 0) FROM usage_monthly)),
  ('total_successes', (SELECT COALESCE(SUM(success_count), 0) FROM usage_monthly));
