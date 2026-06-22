# PeachGames Plus Code → Coordinates Converter

Konwertuje Open Location Codes (Google Plus Codes) na współrzędne geograficzne (lat/lng). Używane do dodawania nowych miejsc (map markers, questy, taski) na podstawie kodów Plus Code.

## Usage

### Pojedynczy kod z miejscowością

```bash
python3 web-app/scripts/pluscode-to-coords.py "3MXW+VQ Nielepice"
```

### Wiele kodów ze wspólną referencją

```bash
python3 web-app/scripts/pluscode-to-coords.py "3MXW+VQ" "4P44+6G" "4P45+QJ" --locality nielepice
```

### Batch z pliku CSV

```bash
python3 web-app/scripts/pluscode-to-coords.py --batch lokalizacje.csv
```

CSV musi zawierać kolumnę `plus_code` (opcjonalnie `name`, `lat`, `lng` dla referencji).

### Generowanie SQL INSERT dla map_markers

```bash
python3 web-app/scripts/pluscode-to-coords.py --csv "3MXW+VQ Nielepice" "4P44+6G Nielepice" --sql --game-id ef910ea9-4fec-4ace-9ec8-8842a5674684
```

### Wyświetlenie znanych miejscowości

```bash
python3 web-app/scripts/pluscode-to-coords.py --list-localities
```

## Instalacja zależności

```bash
pip install --user --break-system-packages openlocationcode
```

## Znane miejscowości referencyjne

Dodawaj nowe do `REFERENCE_LOCATIONS` w skrypcie:

| Miejscowość | lat | lng |
|-------------|-----|-----|
| Nielepice | 50.094 | 19.744 |
| Brzoskwinia | 50.092 | 19.720 |
| Chrośna | 50.083 | 19.730 |

## Workflow przy dodawaniu questów

1. Zbierz Plus Code'y od użytkownika (np. `"3MXW+VQ Nielepice"`)
2. Uruchom skrypt by uzyskać `lat`/`lng`
3. Użyj `supabase_execute_sql` do INSERT w `quests`, `tasks`, i `map_markers`
4. Map markers potrzebują `task_id` z nowo utworzonych tasków
