# Technical research and decisions

## Source hierarchy and access

1. [Official challenge](https://delhi.transportstack.in/hackathon/) and [detailed Problem 2 brief](https://docs.google.com/document/d/1ocS9rG4_E_Fb9DJcqTG8SClrLJJ_UJqGGAhgPbV8tr4/preview). The browser parser could not render the document, but its public `export?format=txt` endpoint succeeded. The brief asks for bus-only planning using static GTFS, a reproducible crowding pipeline, segment/time outputs and checks across weeks. Its example seat labels require evidence we do not have, so this prototype reports a relative sampled-demand signal.
2. [October dataset README](https://pub-091bd9e794bb4877b10b29e6df80f065.r2.dev/2026-10/README.md) identifies the supplied schema and missing vehicle numbers. This determined explicit NULL parsing, passenger-weighting and the decision against trip-level occupancy claims.
3. [GTFS Schedule reference](https://gtfs.org/documentation/schedule/reference/) defines trip/route/stop references, stop order, service calendars, exceptions and after-midnight times. These determine importer and routing invariants. Frequency-based service is rejected rather than approximated; shapes are not currently rendered.
4. [Open Transit Data documentation](https://otd.delhi.gov.in/documentation/) warns that its stop times use constant-speed approximations. We did not download or substitute that older network. Accuracy of the supplied hackathon feed remains unverified against actual operations; UI times are explicitly schedule estimates.

The official platform's public catalogue was inspected through the same unauthenticated metadata endpoints used by its website. Download instructions require a registered account and dataset request. The user supplied the full authorised GTFS after completing the account workflow. No account access controls were bypassed. Public sample inspection is recorded in `docs/data/network-quality.md`.

## Research that influenced the design

- [De Caro et al., 2025](https://www.mdpi.com/2624-6511/8/6/190): the accessible paper explores a crowding-aware recommendation framework balancing preferences and operational concerns using Lyon data. It supports an explicit time/crowding/transfer trade-off, not transplanting its performance claims to Delhi. RAAHI uses transparent configurable weights and a detour cap; no claim of network-wide crowd redistribution is made.
- [Sánchez-Martínez et al., 2018](https://journals.sagepub.com/doi/10.1177/0361198118796940): the accessible abstract describes integrating fare, vehicle-location and passenger-count evidence for load inference. The full text is restricted. This supports treating missing vehicle linkage/calibration as an actual limitation rather than scaling every route by a universal factor.
- The supplied [ScienceDirect S0968090X20305623](https://www.sciencedirect.com/science/article/pii/S0968090X20305623) and [S0965856413001146](https://www.sciencedirect.com/science/article/pii/S0965856413001146) links returned HTTP 403. Their findings were not verified and are not used as implementation evidence.

## Selected method and alternatives

Route analysis uses an empirical day-type/time profile shrunk toward the all-day time profile. The production segment profile uses a same-slot mean after fixed-window checks showed only small, metric-dependent differences. Evaluate 15/30-minute bins chronologically against a per-route average. This is interpretable with one month of data; gradient boosting was not implemented because extra complexity is not justified before resolving network/calibration gaps.

Potential occupancy reconstruction requires vehicle-trip assignment, boarding/alighting timing, service supply, capacity and representativeness. Approximately half the supplied vehicle identifiers are missing. Planned alighting may differ from actual alighting. `created_at` is a transaction-time proxy; no available evidence establishes exact boarding time or downstream traversal time. Therefore mapped tickets contribute to all traversed segments in the boarding proxy's bucket, not a supposed time-resolved onboard count.

Scheduled-service counts are implemented and tested but not used as a denominator in the current model. A count of scheduled vehicles cannot by itself align transaction-time segment demand to actual services. No zero or invented frequency denominator is used. A full feed and a measured timing/supply strategy must precede per-service normalization.

The official Problem 3 page's 3-4% figure is a citywide context, not a route-level sampling probability. Dividing by 0.03 or 0.04 would inflate sampled demand by 33.3x or 25x, a 33.3% spread before any route bias; neither produces verified occupancy. Those scalings are not shown in the app.

Duplicate export rows cannot be identified with certainty without transaction IDs. Exact duplicate groups are reported and retained; this particular archive contains zero surplus exact rows. Ambiguous stop mappings are quarantined, and fuzzy names are not accepted automatically. Direction is preserved through route names and GTFS stop order even when direction_id is empty.

## Validation boundary

The model is evaluated against e-ticket demand, not occupancy. Zero-filled bins mean no observed sample transactions. First 23 dates train, final eight dates validate. The same validation selects window width, so there is no untouched final test set. Absolute MAE differs with bin width; WAPE selects the width. No claimed confidence probability or calibrated interval exists. Physical crowding, service-time accuracy and real Delhi journey correctness need independent evidence.
