"""Optional MP4 export: pip install imageio-ffmpeg==0.8.1 first."""

import subprocess
from pathlib import Path
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run(
    [
        ffmpeg,
        "-y",
        "-v",
        "error",
        "-i",
        str(root / "submission/demo.webm"),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(root / "submission/demo.mp4"),
    ],
    check=True,
)
subprocess.run(
    [ffmpeg, "-v", "error", "-i", str(root / "submission/demo.mp4"), "-f", "null", "-"],
    check=True,
)
print("MP4 exported and fully decoded successfully")
