# Network quality and matching

```json
{
  "status": "ready",
  "stops": 6862,
  "routes": 2574,
  "trips": 80357,
  "stop_times": 2737136,
  "dangling_stop_times": 0,
  "missing_stops": 0,
  "patterns": 3498,
  "rejected_trips": 0,
  "unused_trips": 0,
  "matching_coverage": 0.320125911217591,
  "matched_tickets": 819490,
  "total_valid_tickets": 2559899,
  "reasons": {
    "unmatched_stops_or_direction": 1228307,
    "matched": 819490,
    "ambiguous_path": 471150,
    "unknown_route": 40952
  },
  "modeled_patterns": 100,
  "modeled_tickets": 388083,
  "modeled_ticket_share": 0.15160090300437634,
  "modeled_share_of_unambiguous_matches": 0.47356648647329436,
  "scope": "Top 100 unambiguously matched patterns by ticket volume; other journeys retain unavailable predictions.",
  "scheduled_denominator": "Not used: transaction times do not identify services or downstream traversal times reliably.",
  "feed_info": [
    {
      "feed_publisher_name": "Delhi Transport Corporation",
      "feed_publisher_url": "http://dtc.delhi.gov.in/",
      "feed_lang": "en",
      "feed_start_date": "20250101",
      "feed_end_date": "20400101",
      "feed_version": "v32"
    },
    {
      "feed_publisher_name": "Delhi Integrated Multi-Modal Transit System Ltd.",
      "feed_publisher_url": "https://www.dimts.in/",
      "feed_lang": "en",
      "feed_start_date": "20250101",
      "feed_end_date": "20400101",
      "feed_version": "v32"
    }
  ]
}
```

Unmatched records are retained in private diagnostics. Fuzzy stop assignments are never accepted automatically. The public sample was examined and rejected for broken foreign-key references.
