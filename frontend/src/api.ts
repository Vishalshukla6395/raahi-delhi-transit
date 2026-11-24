export type Stop = { id: string; name: string; lat: number; lon: number };
export type Prediction = {
  index: number | null;
  category: string;
  evidence: string;
  observed_days: number;
  tickets: number;
  expected?: number;
  backoff?: string;
  historical_range?: number[];
  definition?: string;
};
export type Segment = {
  id: string;
  start: Stop;
  end: Stop;
  minutes: number;
  prediction: Prediction;
};
export type Leg = {
  pattern_id: string;
  route: string;
  origin: Stop;
  destination: Stop;
  departure: string;
  arrival: string;
  segments: Segment[];
};
export type Journey = {
  id: string;
  legs: Leg[];
  duration_minutes: number;
  ride_minutes: number;
  transfers: number;
  demand_index: number | null;
  prediction_coverage: number;
  evidence: string;
  explanation: string;
  timing_basis: string;
  geometry_basis: string;
  comparison?: {
    extra_minutes: number;
    index_points_lower: number | null;
    reference_minutes: number;
    reference_index: number | null;
    status: string;
    caveat: string;
  } | null;
};
export type SearchResult = {
  journeys: Journey[];
  departure_comparison: {
    offset_minutes: number;
    departure: string;
    journey: Journey | null;
  }[];
  message?: string;
};
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, options);
  const body = await response.json();
  if (!response.ok) {
    const detail = body.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : detail?.message ||
            "The request could not be completed. Check your inputs and try again.",
    );
  }
  return body;
}
export const pretty = (n: number | undefined | null) =>
  n == null ? "Unavailable" : new Intl.NumberFormat("en-IN").format(n);
export const crowdColor = (n: number | null) =>
  n == null
    ? "#758681"
    : n <= 25
      ? "#277c67"
      : n <= 50
        ? "#799647"
        : n <= 75
          ? "#bf8226"
          : "#b64b40";
