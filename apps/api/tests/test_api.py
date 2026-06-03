from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_forecast_endpoint():
    response = client.get("/api/v1/forecast?country=USA&indicator=NY.GDP.MKTP.KD.ZG&horizon=3")
    assert response.status_code == 200
    assert len(response.json()) == 3


def test_correlation_endpoint():
    response = client.get("/api/v1/correlations?x_indicator=FP.CPI.TOTL.ZG&y_indicator=NY.GDP.MKTP.KD.ZG")
    assert response.status_code == 200
    assert "correlation" in response.json()
