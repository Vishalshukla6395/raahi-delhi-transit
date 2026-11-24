"""Package current source and deliverables without private data or dependencies."""

import hashlib
import json
from pathlib import Path
import subprocess
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "submission" / "release"
ALLOWED_ROOTS = {"backend", "frontend", "scripts", "docs", "submission"}
ALLOWED_FILES = {
    "README.md", "BUILD_STATUS.md", "ATTRIBUTION.md", "LICENSE",
    "pyproject.toml", "requirements-lock.txt", ".gitignore", ".gitattributes", ".env.example",
}
EXCLUDED_PARTS = {
    "node_modules", "__pycache__", "dist", "coverage", "release", "private",
    ".venv", ".git", ".pytest_cache", ".ruff_cache",
}


def main():
    # Include the working tree, including new files, rather than an older commit.
    names = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
    ).decode("utf-8").split("\0")
    selected = []
    for name in sorted(set(filter(None, names))):
        path = Path(name)
        allowed = (name in ALLOWED_FILES or path.parts[0] in ALLOWED_ROOTS
                   or (name.startswith("data/reports/") and path.suffix == ".json"))
        if not allowed or EXCLUDED_PARTS.intersection(path.parts):
            continue
        if path.name.startswith(".env") and name != ".env.example":
            continue
        source = ROOT / path
        if source.is_symlink():
            raise ValueError(f"Refusing symlink: {name}")
        if source.is_file():
            selected.append((name, source.read_bytes()))
    required = {"README.md", "submission/proposal.pdf", "submission/technical-note.pdf",
                "submission/demo.mp4", "submission/checklist.md", "frontend/package-lock.json"}
    missing = required - {name for name, _ in selected}
    if missing:
        raise ValueError(f"Missing required files: {sorted(missing)}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    archive = OUTPUT / "RAAHI-prototype-submission.zip"
    manifest = {name: {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                for name, data in selected}
    with ZipFile(archive, "w", ZIP_DEFLATED) as bundle:
        for name, data in selected:
            bundle.writestr(f"RAAHI/{name}", data)
        bundle.writestr("RAAHI/MANIFEST.json", json.dumps(manifest, indent=2) + "\n")
    with ZipFile(archive) as bundle:
        assert bundle.testzip() is None, "Archive CRC verification failed"
        for name, expected in manifest.items():
            assert hashlib.sha256(bundle.read(f"RAAHI/{name}")).hexdigest() == expected["sha256"]
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    (OUTPUT / "SHA256SUMS.txt").write_text(f"{checksum}  {archive.name}\n", encoding="utf-8")
    print(json.dumps({"archive": str(archive), "files": len(selected),
                      "bytes": archive.stat().st_size, "sha256": checksum,
                      "verification": "CRC and every file SHA-256 passed"}, indent=2))


if __name__ == "__main__":
    main()
