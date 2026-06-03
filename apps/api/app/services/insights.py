import statistics

from app.domain.models import Insight
from app.services.repository import MacroRepository


class InsightService:
    def __init__(self, repository: MacroRepository):
        self.repository = repository

    def generate(self) -> list[Insight]:
        inflation = self.repository.latest("FP.CPI.TOTL.ZG")
        growth = self.repository.latest("NY.GDP.MKTP.KD.ZG")
        mean_growth = statistics.mean(row.value for row in growth)
        max_inflation = max(inflation, key=lambda row: row.value)
        outperformers = [row.country_iso3 for row in growth if row.value > mean_growth * 1.5]

        return [
            Insight(
                title="Inflacion extrema detectada",
                narrative=f"{max_inflation.country_iso3} presenta la inflacion mas elevada de la muestra con {max_inflation.value:.1f}%.",
                severity="warning",
                country_iso3=max_inflation.country_iso3,
                indicator_code=max_inflation.indicator_code,
            ),
            Insight(
                title="Crecimiento superior al bloque",
                narrative=f"{', '.join(outperformers)} crecen claramente por encima de la media global demo ({mean_growth:.1f}%).",
                severity="positive",
                indicator_code="NY.GDP.MKTP.KD.ZG",
            ),
        ]
