-- Capital contracts definition tables
CREATE TABLE IF NOT EXISTS capital_contracts (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  chapter INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  resource_code TEXT NOT NULL,
  amount_required INTEGER NOT NULL,
  reward_coins INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_contracts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'completed')),
  progress INTEGER NOT NULL DEFAULT 0,
  accepted_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contract_id) REFERENCES capital_contracts(id),
  UNIQUE(user_id, contract_id)
);

CREATE INDEX IF NOT EXISTS idx_user_contracts_user_status
  ON user_contracts(user_id, status);

