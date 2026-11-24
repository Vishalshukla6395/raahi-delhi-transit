"""Create a private CLI deployment from real models and the built frontend.

Run after npm --prefix frontend run build. Never commit the generated folder.
"""

import gzip
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp" / "vercel-deploy"
RUNTIME = ("__init__.py", "api.py", "config.py", "domain.py", "model.py",
           "network.py", "planner.py", "schemas.py")
MODELS = ("network.json", "route-model.json", "segment-model.json")
REPORTS = ("data-quality.json", "validation.json", "network-quality.json",
           "segment-validation.json", "model-audit.json", "tradeoff-examples.json")


def main():
    if not (ROOT / "frontend/dist/index.html").exists():
        raise SystemExit("First run: npm --prefix frontend run build")
    for name in MODELS:
        if not (ROOT / "data/processed" / name).is_file():
            raise SystemExit(f"Missing real artifact: {name}")
    OUT.mkdir(parents=True, exist_ok=True)
    # Only replace known generated folders, retaining the user's .vercel link.
    for name in ("backend", "data", "public"):
        target = OUT / name
        if target.is_symlink() or target.resolve().parent != OUT.resolve():
            raise ValueError(f"Unsafe generated path: {target}")
        if target.exists():
            shutil.rmtree(target)
    package = OUT / "backend/raahi"
    package.mkdir(parents=True)
    for name in RUNTIME:
        shutil.copy2(ROOT / "backend/raahi" / name, package / name)
    manifest = {}
    for folder, names in (("processed", MODELS), ("reports", REPORTS)):
        dest = OUT / "data" / folder
        dest.mkdir(parents=True)
        for name in names:
            source = ROOT / "data" / folder / name
            raw = source.read_bytes()
            packed = gzip.compress(raw, compresslevel=6, mtime=0)
            assert gzip.decompress(packed) == raw
            (dest / (name + ".gz")).write_bytes(packed)
            manifest[f"{folder}/{name}"] = {
                "sha256": hashlib.sha256(raw).hexdigest(),
                "source_bytes": len(raw), "upload_bytes": len(packed),
            }
    shutil.copytree(ROOT / "frontend/dist", OUT / "public")
    (OUT / "app.py").write_text(
        'import sys\nfrom pathlib import Path\n'
        'sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))\n'
        'from raahi.api import app\n', encoding="utf-8")
    (OUT / "pyproject.toml").write_text(
        '[project]\nname = "raahi-vercel"\nversion = "0.1.0"\n'
        'requires-python = ">=3.12,<3.13"\n'
        'dependencies = ["fastapi==0.165.0", "tzdata==2026.6"]\n'
        '\n[tool.vercel]\nentrypoint = "app:app"\n', encoding="utf-8")
    (OUT / "vercel.json").write_text(json.dumps({
        "$schema": "https://openapi.vercel.sh/vercel.json",
        "framework": "fastapi",
        "functions": {"app.py": {"maxDuration": 300}},
    }, indent=2) + "\n", encoding="utf-8")
    (OUT / ".vercelignore").write_text(
        '__pycache__/\n**/__pycache__/\n.venv/\nmanifest.json\n', encoding="utf-8")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    total = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(json.dumps({"folder": str(OUT), "upload_mb": round(total / 1_000_000, 2),
                      "model_integrity": "all compressed files verified",
                      "data_publicly_served": False}, indent=2))


if __name__ == "__main__":
    main()
