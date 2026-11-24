import re
import unicodedata
from datetime import datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


@lru_cache(maxsize=32768)
def normalize(value: str) -> str:
    """Only punctuation, Unicode and whitespace equivalence; no geographic guesses."""
    return re.sub(
        r"[^a-z0-9]", "", unicodedata.normalize("NFKC", str(value)).casefold()
    )


def parse_timestamp(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ValueError("An explicit timezone is required")
    return dt.astimezone(IST)


def gtfs_seconds(value: str) -> int:
    h, m, s = map(int, value.split(":"))
    if h < 0 or not (0 <= m < 60 and 0 <= s < 60):
        raise ValueError("Invalid GTFS time")
    return h * 3600 + m * 60 + s


def segment_indices(board: int, alight: int) -> list[int]:
    if board < 0 or alight <= board:
        raise ValueError("Alighting must follow boarding")
    return list(range(board, alight))


def valid_passengers(value) -> bool:
    try:
        number = float(value)
        return number > 0 and number.is_integer() and number < float("inf")
    except (ValueError, TypeError):
        return False
