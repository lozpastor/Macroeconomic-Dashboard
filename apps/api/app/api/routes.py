from fastapi import APIRouter, Query

from app.services.analytics import AnalyticsService
from app.services.insights import InsightService
from app.services.repository import MacroRepository

router = APIRouter()
repository = MacroRepository()
analytics = AnalyticsService(repository)
insights = InsightService(repository)


@router.get("/countries")
def get_countries():
    return repository.countries()


@router.get("/indicators")
def get_indicators():
    return repository.indicators()


@router.get("/observations")
def get_observations(indicator: str, countries: list[str] | None = Query(default=None)):
    return repository.observations(indicator, countries)


@router.get("/insights")
def get_insights():
    return insights.generate()


@router.get("/correlations")
def get_correlations(x_indicator: str, y_indicator: str):
    return analytics.correlation(x_indicator, y_indicator)


@router.get("/forecast")
def get_forecast(country: str, indicator: str, horizon: int = 3, method: str = "arima"):
    return analytics.forecast(country, indicator, horizon, method)
