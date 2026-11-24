import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(os.environ.get("RAAHI_DATA_DIR", ROOT / "data")).resolve()
RAW, PROCESSED, REPORTS = (DATA / p for p in ("raw", "processed", "reports"))
for path in (RAW, PROCESSED, REPORTS):
    path.mkdir(parents=True, exist_ok=True)
