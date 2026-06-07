-- Add missing tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE task_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE quest_activations;
