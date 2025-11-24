-- Allow city relocation cooldown
ALTER TABLE cities ADD COLUMN move_cooldown_until INTEGER DEFAULT 0;

