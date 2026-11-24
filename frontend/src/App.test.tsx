import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { App } from "./App";
import { StopSearch } from "./StopSearch";
import type { Stop } from "./api";
vi.mock("./JourneyMap", () => ({
  JourneyMap: () => <div>Map test fixture</div>,
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: () => <div>Demand chart</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  BarChart: () => null,
  Bar: () => null,
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
const overview = {
  quality: {
    total_records: 100,
    valid_records: 100,
    exact_duplicate_surplus: 0,
    coverage: {
      first_date: "2026-10-01",
      last_date: "2026-10-31",
      dates: 31,
      routes: 1,
      sampled_passengers: 105,
    },
    top_routes: [{ id: "1up", name: "1UP", tickets: 100 }],
    hourly: [],
  },
  network: { status: "blocked" },
  validation: { selected_minutes: 30, variants: [] },
  limitations: ["Partial sample"],
};
const respond = (data: any) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);
describe("actual user states", () => {
  it("shows loading while the API is pending", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading real October",
    );
  });
  it("shows a useful network failure and retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Data service unavailable",
    );
    expect(
      screen.getByRole("button", { name: "Retry connection" }),
    ).toBeEnabled();
  });
  it("does not fabricate journeys when GTFS is missing and opens real-data explorer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        respond(
          url.includes("overview")
            ? overview
            : { points: [], bin_minutes: 30, historical_through: "2026-10-31" },
        ),
      ),
    );
    render(<App />);
    expect(
      await screen.findByRole("button", { name: "Find journeys" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Journey planning awaits the official network"),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: /Explore the real ticket data/ }),
    );
    expect(await screen.findByText("Demand by route")).toBeVisible();
  });
  it("stop autocomplete supports keyboard selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        respond({
          available: true,
          items: [{ id: "A", name: "Alpha Stop", lat: 28, lon: 77 }],
        }),
      ),
    );
    const change = vi.fn();
    render(<StopSearch label="Origin" value={null} onChange={change} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Alpha" } });
    await screen.findByRole("option");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ id: "A" }));
  });
  it("shows an empty stop search without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => respond({ available: true, items: [] })),
    );
    render(<StopSearch label="Origin" value={null} onChange={() => {}} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Unknown" } });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("No matching stops"),
    );
  });
  it("confirms a single suggestion with Enter and visibly clears confirmation when edited", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respond({
      available: true,
      items: [{ id: "A", name: "Alpha Stop", lat: 28, lon: 77 }],
    })));
    const submit = vi.fn((e: React.FormEvent) => e.preventDefault());
    function Form() {
      const [stop, setStop] = useState<Stop | null>(null);
      return <form onSubmit={submit}><StopSearch label="From" value={stop} onChange={setStop} /></form>;
    }
    render(<Form />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Alpha" } });
    await screen.findByRole("option");
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText("Selected · Stop A")).toBeVisible();
    fireEvent.change(input, { target: { value: "Alpha S" } });
    expect(input).toHaveValue("Alpha S");
    expect(screen.queryByText("Selected · Stop A")).not.toBeInTheDocument();
    expect(screen.getByText(/Choose a stop from the list/)).toBeVisible();
  });
  it("requires a choice for duplicate names and preserves suggestions when focus moves to an option", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respond({
      available: true,
      items: ["A", "B"].map(id => ({ id, name: "Alpha Stop", lat: 28, lon: 77 })),
    })));
    const change = vi.fn();
    render(<StopSearch label="From" value={null} onChange={change} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Alpha Stop" } });
    const options = await screen.findAllByRole("option");
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
    expect(change).not.toHaveBeenCalled();
    fireEvent.blur(input, { relatedTarget: options[1] });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 160)); });
    expect(options[1]).toBeVisible();
    fireEvent.click(options[1]);
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ id: "B" }));
  });
  it("handles an API with no processed dataset", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => respond({ ...overview, quality: {} })),
    );
    render(<App />);
    expect(
      await screen.findByText("Ticket history is not loaded yet"),
    ).toBeVisible();
  });
  for (const empty of [false, true])
    it(
      empty
        ? "shows a genuine empty journey result"
        : "completes a fixture journey and inspects an unavailable segment",
      async () => {
        const a = { id: "A", name: "Alpha Stop", lat: 28.6, lon: 77.2 },
          d = { id: "D", name: "Delta Stop", lat: 28.7, lon: 77.3 };
        const prediction = {
          index: null,
          category: "Unavailable",
          evidence: "unavailable",
          observed_days: 0,
          tickets: 0,
        };
        const j = {
          id: "one",
          duration_minutes: 35,
          ride_minutes: 30,
          transfers: 0,
          demand_index: null,
          prediction_coverage: 0,
          evidence: "limited",
          explanation: "No matched demand evidence.",
          timing_basis: "Schedule estimate",
          geometry_basis: "Straight stop links",
          legs: [
            {
              pattern_id: "p",
              route: "1UP",
              origin: a,
              destination: d,
              departure: "2026-11-23T08:00:00+05:30",
              arrival: "2026-11-23T08:30:00+05:30",
              segments: [
                { id: "p:0", start: a, end: d, minutes: 30, prediction },
              ],
            },
          ],
        };
        vi.stubGlobal(
          "fetch",
          vi.fn((url: string) =>
            respond(
              url.includes("overview")
                ? { ...overview, network: { status: "ready" } }
                : url.includes("/stops")
                  ? {
                      available: true,
                      items: url.includes("Alpha") ? [a] : [d],
                    }
                  : url.includes("/journeys")
                    ? {
                        journeys: empty ? [] : [j],
                        departure_comparison: [],
                        message: empty
                          ? "No scheduled service in this period."
                          : null,
                      }
                    : {
                        points: [],
                        bin_minutes: 30,
                        historical_through: "2026-10-31",
                      },
            ),
          ),
        );
        render(<App />);
        const from = await screen.findByRole("combobox", { name: "From" });
        fireEvent.focus(from);
        fireEvent.change(from, { target: { value: "Alpha" } });
        fireEvent.click(
          await screen.findByRole("option", { name: /Alpha Stop/ }),
        );
        const to = screen.getByRole("combobox", { name: "To" });
        fireEvent.focus(to);
        fireEvent.change(to, { target: { value: "Delta" } });
        fireEvent.click(
          await screen.findByRole("option", { name: /Delta Stop/ }),
        );
        fireEvent.click(
          screen.getByRole("button", { name: "Find journeys" }),
        );
        if (empty) {
          expect(await screen.findByText("No journey found")).toBeVisible();
          return;
        }
        expect(await screen.findByText("Recommended")).toBeVisible();
        fireEvent.click(
          screen.getByRole("button", {
            name: "Inspect segment Alpha Stop to Delta Stop",
          }),
        );
        expect(screen.getByText(/0 observed days/)).toBeVisible();
        expect(within(screen.getByRole("status")).getByText("Demand unavailable")).toBeVisible();
      },
    );
});
