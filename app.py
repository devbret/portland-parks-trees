import csv
import json
import math
from pathlib import Path
from datetime import datetime

RADIUS_EARTH_M = 6378137.0

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_CSV = SCRIPT_DIR / "Parks_Tree_Inventory.csv"
OUTPUT_GEOJSON = SCRIPT_DIR / "trees.geojson"
OUTPUT_ARRAY_JSON = SCRIPT_DIR / "trees.json" 

X_FIELD = "X"
Y_FIELD = "Y"
ID_FIELD = "OBJECTID"


def mercator_to_lonlat(x: float, y: float) -> tuple[float, float]:
    lon = (x / RADIUS_EARTH_M) * (180.0 / math.pi)
    lat = (2.0 * math.atan(math.exp(y / RADIUS_EARTH_M)) - math.pi / 2.0) * (180.0 / math.pi)
    return lon, lat


def parse_date(value: str) -> str | None:
    if value is None:
        return None
    v = value.strip()
    if not v:
        return None

    for fmt in ("%Y/%m/%d %H:%M:%S%z", "%Y-%m-%d %H:%M:%S%z", "%Y/%m/%d", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(v, fmt)
            return dt.isoformat()
        except ValueError:
            pass

    return v


def detect_dialect(path: Path) -> csv.Dialect:
    with path.open("r", newline="", encoding="utf-8-sig") as f:
        sample = f.read(8192)

    if sample.count("\t") > sample.count(","):
        return csv.excel_tab

    try:
        return csv.Sniffer().sniff(sample, delimiters=[",", "\t", ";", "|"])
    except csv.Error:
        return csv.excel_tab


def convert_csv_to_geojson(input_csv: Path, out_geojson: Path, out_array_json: Path | None) -> None:
    if not input_csv.exists():
        raise FileNotFoundError(f"Input file not found: {input_csv}")

    dialect = detect_dialect(input_csv)

    features = []
    array_rows = []

    with input_csv.open("r", newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, dialect=dialect)

        if not reader.fieldnames:
            raise RuntimeError("Could not read header row. Check delimiter/encoding.")

        if X_FIELD not in reader.fieldnames or Y_FIELD not in reader.fieldnames:
            raise RuntimeError(
                f"Missing required coordinate columns: '{X_FIELD}' and/or '{Y_FIELD}'. "
                f"Found columns: {reader.fieldnames}"
            )

        for row in reader:
            x_raw = (row.get(X_FIELD) or "").strip()
            y_raw = (row.get(Y_FIELD) or "").strip()
            if not x_raw or not y_raw:
                continue

            try:
                x = float(x_raw)
                y = float(y_raw)
            except ValueError:
                continue

            lon, lat = mercator_to_lonlat(x, y)

            props = dict(row)
            props.pop(X_FIELD, None)
            props.pop(Y_FIELD, None)

            for k in ("Inventory_Date", "created_date", "last_edited_date"):
                if k in props:
                    props[k] = parse_date(props.get(k))

            numeric_fields = [
                "OBJECTID",
                "DBH",
                "TreeHeight",
                "CrownWidthNS",
                "CrownWidthEW",
                "CrownBaseHeight",
                "Structural_Value",
                "Carbon_Storage_lb",
                "Carbon_Storage_value",
                "Carbon_Sequestration_lb",
                "Carbon_Sequestration_value",
                "Stormwater_ft",
                "Stormwater_value",
                "Pollution_Removal_value",
                "Pollution_Removal_oz",
                "Total_Annual_Benefits",
                "PropertyID",
                "UserID",
            ]
            for nf in numeric_fields:
                if nf in props:
                    v = (props.get(nf) or "").strip()
                    if v == "":
                        props[nf] = None
                        continue
                    try:
                        props[nf] = int(v) if v.isdigit() else float(v)
                    except ValueError:
                        pass

            feature_id = props.get(ID_FIELD) if ID_FIELD in props else None

            feature = {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": props,
            }
            if feature_id is not None:
                feature["id"] = feature_id

            features.append(feature)

            if out_array_json is not None:
                row_out = dict(props)
                row_out["lon"] = lon
                row_out["lat"] = lat
                if feature_id is not None:
                    row_out["id"] = feature_id
                array_rows.append(row_out)

    geojson = {"type": "FeatureCollection", "features": features}

    with out_geojson.open("w", encoding="utf-8") as out:
        json.dump(geojson, out, ensure_ascii=False, indent=2)

    if out_array_json is not None:
        with out_array_json.open("w", encoding="utf-8") as out:
            json.dump(array_rows, out, ensure_ascii=False, indent=2)


def main():
    convert_csv_to_geojson(INPUT_CSV, OUTPUT_GEOJSON, OUTPUT_ARRAY_JSON)
    print(f"Input: {INPUT_CSV}")
    print(f"Output: {OUTPUT_GEOJSON}")
    if OUTPUT_ARRAY_JSON is not None:
        print(f"Output: {OUTPUT_ARRAY_JSON}")


if __name__ == "__main__":
    main()
