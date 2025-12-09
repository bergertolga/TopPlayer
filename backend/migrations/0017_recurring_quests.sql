CREATE TABLE IF NOT EXISTS recurring_quest_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  quest_code TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK(cadence IN ('daily', 'weekly')),
  cycle_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_resource TEXT,
  target_amount INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'claimed', 'expired')),
  reward_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, quest_code, cycle_key)
);

CREATE INDEX IF NOT EXISTS idx_recurring_quests_user ON recurring_quest_assignments(user_id, cadence, status);
CREATE INDEX IF NOT EXISTS idx_recurring_quests_cycle ON recurring_quest_assignments(cadence, cycle_key);






