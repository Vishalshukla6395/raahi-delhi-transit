import argparse


def main():
    parser = argparse.ArgumentParser(description="RAAHI reproducible pipeline")
    parser.add_argument(
        "command", choices=["acquire", "ingest", "model", "network", "all"]
    )
    parser.add_argument("--gtfs", help="Authorised complete GTFS archive or directory")
    parser.add_argument("--max-patterns", type=int, default=100)
    args = parser.parse_args()
    if args.command == "acquire":
        from .acquire import acquire

        acquire()
    if args.command in ("ingest", "all"):
        from .ingest import ingest

        ingest()
    if args.command in ("model", "all"):
        from .pipeline import model_routes

        model_routes()
    if args.command in ("network", "all"):
        from .pipeline import network_pipeline

        network_pipeline(args.gtfs, args.max_patterns)


if __name__ == "__main__":
    main()
