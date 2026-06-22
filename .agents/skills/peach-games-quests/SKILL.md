# Tworzenie questów z taskami i markerami mapy

Instrukcja pokazująca jak dodawać questy z podzadaniami (taskami) i markerami na mapie do istniejącej gry.

## Schemat danych

```
quests (id, title, description, type, reward_points, game_id, klan_id)
  └── tasks (id, quest_id, title, description, type, reward_points, sort_order)
        └── map_markers (id, game_id, type, title, lat, lng, is_active, quest_id, task_id)
```

**WAŻNE**: `map_markers` musi mieć ustawione **zarówno** `quest_id` jak i `task_id`, inaczej:
- Marker nie pokaże się na mapie (visibility gate sprawdza `task_id ∈ currentTaskIds`)
- Przycisk "📷 Wyślij dowód" nie pojawi się (warunek: `marker.type === 'photo' && marker.quest_id`)

## Workflow

### 1. Zbierz dane od użytkownika

- Nazwa questa
- Opis questa
- Typ questa (dla tasków foto: `photo`; dla QR: `qr`; dostępne: `qr`, `gps`, `photo`, `logic`, `chase`)
- Punkty łączne questa
- Czy quest dla konkretnego klanu czy dla wszystkich (NULL = wszyscy)
- Game ID (UUID gry)
- Lista tasków — każdy z: nazwą, opisem, typem, punktami
- Dla każdego taska: lokalizacja (Plus Code lub lat/lng)

### 2. Przekonwertuj Plus Code na współrzędne

```bash
python3 web-app/scripts/pluscode-to-coords.py "3MXW+VQ Nielepice" "4P44+6G Nielepice"
```

### 3. Wykonaj INSERT (jednym zapytaniem przez CTE)

```sql
WITH new_quest AS (
  INSERT INTO quests (title, description, type, reward_points, game_id, klan_id)
  VALUES (
    'Nazwa Questu', 'Opis questa...', 'photo', 150,
    'UUID_GRY', NULL  -- NULL = dla wszystkich klanów
  )
  RETURNING id AS quest_id
),
new_tasks AS (
  INSERT INTO tasks (quest_id, title, description, type, reward_points, sort_order)
  SELECT quest_id, v.title, v.description, 'photo', 50, v.sort_order
  FROM new_quest, (VALUES
    (1, 'Task 1', 'Opis taska 1'),
    (2, 'Task 2', 'Opis taska 2'),
    (3, 'Task 3', 'Opis taska 3')
  ) AS v(sort_order, title, description)
  RETURNING id AS task_id, sort_order
),
task_ids AS (
  SELECT task_id, sort_order FROM new_tasks
)
INSERT INTO map_markers (game_id, type, title, lat, lng, is_active, quest_id, task_id)
SELECT 
  'UUID_GRY', 'photo', 
  CASE t.sort_order WHEN 1 THEN 'Task 1' WHEN 2 THEN 'Task 2' WHEN 3 THEN 'Task 3' END,
  CASE t.sort_order WHEN 1 THEN xx.xxxxx WHEN 2 THEN yy.yyyyy WHEN 3 THEN zz.zzzzz END,
  CASE t.sort_order WHEN 1 THEN xx.xxxxx WHEN 2 THEN yy.yyyyy WHEN 3 THEN zz.zzzzz END,
  true,
  (SELECT quest_id FROM new_quest),  -- ← KRYTYCZNE: quest_id!
  t.task_id
FROM task_ids t;
```

Użyj `supabase_execute_sql` do wykonania.

### 4. Sprawdź poprawność

```sql
SELECT q.title AS quest, t.title AS task, m.title AS marker, m.lat, m.lng, m.quest_id, m.task_id
FROM quests q
JOIN tasks t ON t.quest_id = q.id
JOIN map_markers m ON m.task_id = t.id
WHERE q.game_id = 'UUID_GRY'
ORDER BY t.sort_order;
```

## Ograniczenia wyświetlania markerów

Markery `photo` i `qr` na mapie **nie są widoczne od razu**. Pojawiają się tylko gdy:
1. Gra ma status `active`
2. Klan **aktywował quest** (przycisk "Aktywuj" w widoku Próby)
3. Dany task jest **aktualnym nieukończonym** zadaniem w queście

To świadome — gracze widzą tylko markery dla zadania, które aktualnie wykonują.

## Obsługiwane typy markerów

| type | Ikona | Przycisk w popupie |
|------|-------|--------------------|
| `qr` | 📱 QR | "📱 Skanuj QR" → QRScannerModal |
| `photo` | 📷 Foto | "📷 Wyślij dowód" → MediaUploadModal |
| `quest` | 📍 Ogólny | brak — tylko tytuł i opis |
| `chase` | 🐎 Gonitwa | brak — akcja automatyczna |
| `clan_base` | 🏠 Klan | brak — tylko informacja |
