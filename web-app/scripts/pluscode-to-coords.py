#!/usr/bin/env python3
"""Konwertuje Open Location Codes (Plus Codes) na współrzędne geograficzne.

Usage:
  python3 scripts/pluscode-to-coords.py "3MXW+VQ Nielepice"
  python3 scripts/pluscode-to-coords.py "3MXW+VQ" "4P44+6G" "4P45+QJ" --ref-lat 50.094 --ref-lng 19.744
  python3 scripts/pluscode-to-coords.py --batch nielepice.csv

Dependencies: pip install --user --break-system-packages openlocationcode
"""

import argparse
import csv
import re
import sys
from typing import Optional, Tuple

try:
    from openlocationcode import openlocationcode as olc
except ImportError:
    print("Brak biblioteki openlocationcode.", file=sys.stderr)
    print("Zainstaluj: pip install --user --break-system-packages openlocationcode", file=sys.stderr)
    sys.exit(1)


# Predefined reference locations for common Polish localities near the game area
REFERENCE_LOCATIONS = {
    "nielepice": (50.094, 19.744),
    "brzoskwinia": (50.092, 19.720),
    "chrosna": (50.083, 19.730),
    "rzozow": (50.085, 19.750),
    "krakow": (50.065, 19.945),
}


def parse_plus_code(raw: str) -> Tuple[str, Optional[str], Optional[float], Optional[float]]:
    """Parse raw input like '3MXW+VQ Nielepice' or '3MXW+VQ,50.094,19.744'."""
    parts = raw.strip().split()
    code = parts[0]
    locality = None
    ref_lat = None
    ref_lng = None

    if len(parts) > 1:
        location_part = " ".join(parts[1:])
        # Check if it's comma-separated coords
        if "," in location_part:
            coords = location_part.split(",")
            if len(coords) >= 2:
                try:
                    ref_lat = float(coords[0].strip())
                    ref_lng = float(coords[1].strip())
                except ValueError:
                    pass
        else:
            locality = location_part.lower().strip()
            if locality in REFERENCE_LOCATIONS:
                ref_lat, ref_lng = REFERENCE_LOCATIONS[locality]

    return code, locality, ref_lat, ref_lng


def decode_plus_code(
    code: str,
    ref_lat: Optional[float] = None,
    ref_lng: Optional[float] = None,
    locality: Optional[str] = None,
) -> Tuple[str, float, float]:
    """Decode a Plus Code to a full code + center lat/lng."""
    if locality and ref_lat is None:
        ref_lat, ref_lng = REFERENCE_LOCATIONS.get(locality, (None, None))

    if ref_lat is not None and ref_lng is not None:
        full_code = olc.recoverNearest(code, ref_lat, ref_lng)
    elif olc.isFull(code):
        full_code = code
    else:
        raise ValueError(
            f"Short code '{code}' needs a reference location. "
            f"Pass --ref-lat/--ref-lng or a known locality: {list(REFERENCE_LOCATIONS.keys())}"
        )

    if not olc.isValid(full_code):
        raise ValueError(f"'{code}' decoded to '{full_code}' which is not a valid Plus Code")

    decoded = olc.decode(full_code)
    lat = (decoded.latitudeLo + decoded.latitudeHi) / 2
    lng = (decoded.longitudeLo + decoded.longitudeHi) / 2
    return full_code, lat, lng


def print_csv_header():
    print("plus_code,full_code,lat,lng,name")


def print_csv_row(plus_code: str, full_code: str, lat: float, lng: float, name: str = ""):
    print(f"{plus_code},{full_code},{lat:.6f},{lng:.6f},{name}")


def main():
    parser = argparse.ArgumentParser(
        description="Konwertuj Open Location Codes (Plus Codes) na współrzędne GPS"
    )
    parser.add_argument(
        "codes", nargs="*", default=[],
        help="Plus Code(y) np. '3MXW+VQ Nielepice' lub '3MXW+VQ' (wymaga --ref-lat/--ref-lng)"
    )
    parser.add_argument("--ref-lat", type=float, help="Szerokość geograficzna referencyjna")
    parser.add_argument("--ref-lng", type=float, help="Długość geograficzna referencyjna")
    parser.add_argument("--locality", type=str, help="Nazwa miejscowości (klucz w REFERENCE_LOCATIONS)")
    parser.add_argument("--batch", type=str, help="Plik CSV z kolumną 'plus_code' (i opcjonalnie 'name', 'lat', 'lng')")
    parser.add_argument("--csv", action="store_true", help="Wyjście w formacie CSV")
    parser.add_argument("--sql", action="store_true", help="Wyjście jako INSERT SQL dla map_markers")
    parser.add_argument("--game-id", type=str, help="UUID gry (wymagane z --sql)")
    parser.add_argument("--list-localities", action="store_true", help="Wyświetl znane miejscowości")

    args = parser.parse_args()

    if args.list_localities:
        print("Znane miejscowości referencyjne:")
        for name, (lat, lng) in sorted(REFERENCE_LOCATIONS.items()):
            print(f"  {name:20s} → {lat:.4f}, {lng:.4f}")
        return

    global_ref_lat = args.ref_lat
    global_ref_lng = args.ref_lng

    if args.locality:
        if args.locality.lower() in REFERENCE_LOCATIONS:
            global_ref_lat, global_ref_lng = REFERENCE_LOCATIONS[args.locality.lower()]
        else:
            print(f"Nieznana miejscowość '{args.locality}'. Dostępne: {list(REFERENCE_LOCATIONS.keys())}", file=sys.stderr)
            sys.exit(1)

    results = []

    # Batch mode from CSV
    if args.batch:
        with open(args.batch, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                plus_code = row.get("plus_code", row.get("plus code", "")).strip()
                if not plus_code:
                    continue
                name = row.get("name", row.get("title", "")).strip()
                ref_lat = global_ref_lat
                ref_lng = global_ref_lng
                if row.get("lat") and row.get("lng"):
                    try:
                        ref_lat = float(row["lat"])
                        ref_lng = float(row["lng"])
                    except ValueError:
                        pass

                try:
                    full_code, lat, lng = decode_plus_code(plus_code, ref_lat, ref_lng)
                    results.append((plus_code, full_code, lat, lng, name))
                except ValueError as e:
                    print(f"Błąd dla '{plus_code}': {e}", file=sys.stderr)

    # CLI arg mode
    for raw in args.codes:
        code_str, locality, ref_lat, ref_lng = parse_plus_code(raw)
        if ref_lat is None:
            ref_lat = global_ref_lat
        if ref_lng is None:
            ref_lng = global_ref_lng

        try:
            full_code, lat, lng = decode_plus_code(code_str, ref_lat, ref_lng, locality)
            results.append((code_str, full_code, lat, lng, ""))
        except ValueError as e:
            print(f"Błąd dla '{raw}': {e}", file=sys.stderr)

    if not results:
        return

    # Output
    if args.sql:
        if not args.game_id:
            print("Błąd: --game-id jest wymagany dla --sql", file=sys.stderr)
            sys.exit(1)
        print("-- Auto-generated from Plus Codes")
        print("INSERT INTO map_markers (game_id, type, title, lat, lng, is_active) VALUES")
        rows = []
        for plus_code, full_code, lat, lng, name in results:
            title = name or plus_code
            rows.append(f"  ('{args.game_id}', 'quest', '{title}', {lat:.6f}, {lng:.6f}, true)")
        print(",\n".join(rows) + ";")
    elif args.csv:
        print_csv_header()
        for plus_code, full_code, lat, lng, name in results:
            print_csv_row(plus_code, full_code, lat, lng, name)
    else:
        for plus_code, full_code, lat, lng, name in results:
            name_str = f" → {name}" if name else ""
            print(f"{plus_code:>12s}  {full_code:<16s}  lat={lat:.6f}  lng={lng:.6f}{name_str}")


if __name__ == "__main__":
    main()
