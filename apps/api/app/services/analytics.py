import numpy as np
from sklearn.linear_model import LinearRegression

from app.domain.models import ForecastPoint
from app.services.repository import MacroRepository


class AnalyticsService:
    def __init__(self, repository: MacroRepository):
        self.repository = repository

    def correlation(self, x_indicator: str, y_indicator: str) -> dict[str, float]:
        x_rows = {row.country_iso3: row.value for row in self.repository.latest(x_indicator)}
        y_rows = {row.country_iso3: row.value for row in self.repository.latest(y_indicator)}
        common = sorted(set(x_rows) & set(y_rows))
        x = np.array([x_rows[iso3] for iso3 in common])
        y = np.array([y_rows[iso3] for iso3 in common])
        corr = float(np.corrcoef(x, y)[0, 1])
        model = LinearRegression().fit(x.reshape(-1, 1), y)
        return {"correlation": corr, "slope": float(model.coef_[0]), "intercept": float(model.intercept_)}

    def forecast(self, country_iso3: str, indicator_code: str, horizon: int = 3, method: str = "arima") -> list[ForecastPoint]:
        rows = self.repository.observations(indicator_code, [country_iso3])
        values = np.array([row.value for row in rows])
        years = np.array([row.year for row in rows]).reshape(-1, 1)
        model = LinearRegression().fit(years, values)
        forecast: list[ForecastPoint] = []
        for step in range(1, horizon + 1):
            year = int(rows[-1].year + step)
            value = float(model.predict(np.array([[year]]))[0])
            band = max(abs(value) * 0.12, 0.5)
            forecast.append(ForecastPoint(year=year, value=value, lower=value - band, upper=value + band, method=method))
        return forecast
