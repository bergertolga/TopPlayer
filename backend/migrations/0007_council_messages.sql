-- Council chat messages
CREATE TABLE IF NOT EXISTS council_messages (
  id TEXT PRIMARY KEY,
  council_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (council_id) REFERENCES councils(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_council_messages_council_time
  ON council_messages(council_id, created_at DESC);

