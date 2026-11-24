from fastapi.testclient import TestClient
from raahi.api import create_app
from raahi.planner import Planner


def test_api_error_and_unavailable_states(monkeypatch, tmp_path):
    import raahi.api as api

    monkeypatch.setattr(api, "PROCESSED", tmp_path)
    monkeypatch.setattr(api, "REPORTS", tmp_path)
    with TestClient(create_app()) as c:
        assert c.get("/health").json()["routing_ready"] is False
        assert c.get("/api/v1/stops?q=Delhi").json()["items"] == []
        assert (
            c.post(
                "/api/v1/journeys/search",
                json=dict(origin="A", destination="D", departure="2026-11-23T08:00:00"),
            ).status_code
            == 422
        )
        assert (
            c.post(
                "/api/v1/journeys/search",
                json=dict(
                    origin="A", destination="D", departure="2026-11-23T08:00:00+05:30"
                ),
            ).status_code
            == 503
        )
        assert (
            c.get(
                "/api/v1/crowding/route-profile?route=bad&date=not-a-date"
            ).status_code
            == 422
        )


def test_main_flow_with_isolated_gtfs_fixture(network, monkeypatch, tmp_path):
    import raahi.api as api

    monkeypatch.setattr(api, "PROCESSED", tmp_path)
    monkeypatch.setattr(api, "REPORTS", tmp_path)
    app = create_app()
    with TestClient(app) as c:
        app.state.network = network
        app.state.planner = Planner(network)
        stops = c.get("/api/v1/stops?q=Alpha").json()["items"]
        assert stops[0]["id"] == "A"
        response = c.post(
            "/api/v1/journeys/search",
            json=dict(
                origin=stops[0]["id"],
                destination="D",
                departure="2026-11-23T07:55:00+05:30",
            ),
        )
        assert response.status_code == 200
        body = response.json()
        assert (
            body["journeys"][0]["legs"][0]["segments"][0]["start"]["name"]
            == "Alpha Stop"
        )
        assert len(body["departure_comparison"]) == 4
        assert (
            c.post(
                "/api/v1/journeys/search",
                json=dict(
                    origin="bad", destination="D", departure="2026-11-23T07:55:00+05:30"
                ),
            ).status_code
            == 422
        )
