"""Public archive only. Full GTFS is an account-authorised manual download."""

import hashlib
import subprocess
import zipfile
from .config import RAW

BASE = "https://pub-091bd9e794bb4877b10b29e6df80f065.r2.dev/2026-10/"


def acquire():
    for name in ("SHA256SUMS", "October-Delhi.csv.zip"):
        cmd = ["curl", "--fail", "--location", "--retry", "3"]
        if name.endswith(".zip"):
            cmd += ["--continue-at", "-"]
        subprocess.run(cmd + ["--output", str(RAW / name), BASE + name], check=True)
    expected = next(
        line.split()[0]
        for line in (RAW / "SHA256SUMS").read_text().splitlines()
        if line.endswith("October-Delhi.csv.zip")
    )
    archive = RAW / "October-Delhi.csv.zip"
    with archive.open("rb") as f:
        actual = hashlib.file_digest(f, "sha256").hexdigest()
    if actual != expected:
        raise ValueError("Archive checksum mismatch; no extraction performed")
    with zipfile.ZipFile(archive) as z:
        members = [n for n in z.namelist() if n == "October-Delhi.csv"]
        if len(members) != 1:
            raise ValueError("Expected official CSV absent")
        target = RAW / "tickets"
        target.mkdir(exist_ok=True)
        with (
            z.open(members[0]) as src,
            (target / "October-Delhi.csv").open("wb") as out,
        ):
            import shutil

            shutil.copyfileobj(src, out)
    print("Checksum verified and official CSV extracted.")
