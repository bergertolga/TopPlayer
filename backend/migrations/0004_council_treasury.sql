-- Add treasury balance to councils table
ALTER TABLE councils ADD COLUMN treasury_balance REAL DEFAULT 0;

