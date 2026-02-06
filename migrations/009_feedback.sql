-- Migration 009: Feedback table
-- Allows users to submit feedback (bug reports, feature requests, etc.)

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,      -- 'bug', 'feature', 'general', 'question'
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',   -- 'new', 'reviewed', 'resolved', 'archived'
  admin_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
