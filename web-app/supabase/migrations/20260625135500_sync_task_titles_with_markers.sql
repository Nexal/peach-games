-- Sync task titles with marker titles
UPDATE tasks t SET title = m.title
FROM map_markers m
WHERE t.id = m.task_id AND t.title != m.title;
