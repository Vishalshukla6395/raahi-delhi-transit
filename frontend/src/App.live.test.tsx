/** Opt-in integration: real HTTP responses, no fabricated transit records.
 * jsdom omits map/chart drawing; this does not replace browser visual QA.
 */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { App } from "./App";

vi.mock("./JourneyMap", () => ({
  JourneyMap: () => <div>Map rendering omitted in jsdom</div>,
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: () => null,
  AreaChart: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  BarChart: () => null,
  Bar: () => null,
}));
const live = process.env.RAAHI_LIVE_API;
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.skipIf(!live)("real Delhi UI and API integration", () => {
  it("loads a supported pair, searches actual journeys and inspects measured evidence", async () => {
    const nativeFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
      nativeFetch(new URL(url, live), init),
    );
    render(<App />);
    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: "Try a journey with demand data" },
        { timeout: 15000 },
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "From" })).not.toHaveValue(
        "",
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "To" })).not.toHaveValue(""),
    );
    fireEvent.change(screen.getByLabelText("Departure date"), {
      target: { value: "2026-11-24" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find journeys" }));
    expect(
      await screen.findByText("Recommended", {}, { timeout: 180000 }),
    ).toBeVisible();
    const segments = screen.getAllByRole("button", {
      name: /^Inspect segment/,
    });
    expect(segments.length).toBeGreaterThan(0);
    fireEvent.click(segments[0]);
    expect(screen.getByText(/observed days/)).toHaveTextContent(
      /[1-9]\d* observed days/,
    );
    expect(screen.getByText(/observed days/)).not.toHaveTextContent(
      "Unavailable",
    );
    expect(screen.getAllByText(/Compared with the fastest option/i)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Our evidence" }));
    expect(screen.getByText("32.0%")).toBeVisible();
    expect(screen.getByText("Segment demand validation")).toBeVisible();
    expect(screen.getByText("Same-time-slot profile (production)")).toBeVisible();
    expect(screen.getByText("Seasonal day-type/time comparison")).toBeVisible();
    expect(screen.getByText("Ticket records modeled directly")).toBeVisible();
    expect(screen.getByText("Model comparison")).toBeVisible();
  }, 200000);
});
