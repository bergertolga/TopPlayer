-- Milestones System Migration
-- Adds milestone tracking and achievement system

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  milestone_type TEXT NOT NULL,
  milestone_value INTEGER DEFAULT 0,
  achieved_at INTEGER NOT NULL,
  claimed_at INTEGER,
  reward_coins INTEGER DEFAULT 0,
  reward_gems INTEGER DEFAULT 0,
  reward_resources_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON milestones(milestone_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_user_type ON milestones(user_id, milestone_type);

