ALTER TABLE quest_activations ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
