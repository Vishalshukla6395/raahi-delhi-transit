"""Public v1 journey schema; source transactions and vehicle IDs are excluded."""

from typing import Literal
from pydantic import BaseModel


class StopOut(BaseModel):
    id: str
    name: str
    lat: float
    lon: float


class PredictionOut(BaseModel):
    index: int | None
    category: str
    evidence: str
    observed_days: int
    tickets: int
    expected: float | None = None
    calendar_days: int | None = None
    backoff: str | None = None
    historical_range: list[float] | None = None
    historical_through: str | None = None
    variability: float | None = None
    definition: str | None = None


class SegmentOut(BaseModel):
    id: str
    start: StopOut
    end: StopOut
    minutes: float
    prediction: PredictionOut


class LegOut(BaseModel):
    pattern_id: str
    route: str
    trip_id: str
    origin: StopOut
    destination: StopOut
    departure: str
    arrival: str
    segments: list[SegmentOut]


class JourneyOut(BaseModel):
    id: str
    legs: list[LegOut]
    duration_minutes: int
    ride_minutes: int
    transfers: int
    demand_index: int | None
    prediction_coverage: float
    evidence: str
    timing_basis: str
    geometry_basis: str
    score: float
    explanation: str
    comparison: dict | None = None


class DepartureOut(BaseModel):
    offset_minutes: int
    departure: str
    journey: JourneyOut | None


class JourneyResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    journeys: list[JourneyOut]
    departure_comparison: list[DepartureOut]
    weights: tuple[float, float, float]
    message: str | None = None
