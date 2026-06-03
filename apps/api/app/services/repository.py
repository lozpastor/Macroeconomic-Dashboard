from app.domain.models import Country, Indicator, Observation


COUNTRIES = [
    Country(iso3="USA", name="United States", continent="North America", region="North America", blocs=["G7", "G20", "OECD", "USMCA", "Developed"], income_group="High income"),
    Country(iso3="CHN", name="China", continent="Asia", region="East Asia", blocs=["G20", "BRICS", "Emerging"], income_group="Upper middle income"),
    Country(iso3="IND", name="India", continent="Asia", region="South Asia", blocs=["G20", "BRICS", "Emerging"], income_group="Lower middle income"),
    Country(iso3="DEU", name="Germany", continent="Europe", region="European Union", blocs=["EU", "G7", "G20", "OECD", "Developed"], income_group="High income"),
    Country(iso3="BRA", name="Brazil", continent="South America", region="Latin America", blocs=["G20", "BRICS", "Mercosur", "Emerging"], income_group="Upper middle income"),
    Country(iso3="ARG", name="Argentina", continent="South America", region="Latin America", blocs=["G20", "Mercosur", "Emerging"], income_group="Upper middle income"),
]

INDICATORS = [
    Indicator(code="NY.GDP.MKTP.KD.ZG", name="GDP growth", category="GDP", unit="% YoY", source="World Bank", higher_is_better=True),
    Indicator(code="FP.CPI.TOTL.ZG", name="Inflation YoY", category="Inflation", unit="% YoY", source="World Bank", higher_is_better=False),
    Indicator(code="GC.DOD.TOTL.GD.ZS", name="Debt/GDP", category="Fiscal", unit="% GDP", source="World Bank", higher_is_better=False),
    Indicator(code="NY.GDP.PCAP.CD", name="GDP per capita", category="GDP", unit="USD", source="World Bank", higher_is_better=True),
]

SERIES: dict[str, dict[str, list[float]]] = {
    "USA": {"NY.GDP.MKTP.KD.ZG": [2.3, -2.2, 5.8, 1.9, 2.5], "FP.CPI.TOTL.ZG": [1.8, 1.2, 4.7, 8.0, 4.1], "GC.DOD.TOTL.GD.ZS": [108, 132, 126, 121, 122], "NY.GDP.PCAP.CD": [65120, 63530, 70248, 76399, 81695]},
    "CHN": {"NY.GDP.MKTP.KD.ZG": [6.0, 2.2, 8.4, 3.0, 5.2], "FP.CPI.TOTL.ZG": [2.9, 2.4, 0.9, 2.0, 0.2], "GC.DOD.TOTL.GD.ZS": [57, 67, 72, 77, 83], "NY.GDP.PCAP.CD": [10144, 10409, 12617, 12720, 12614]},
    "IND": {"NY.GDP.MKTP.KD.ZG": [3.9, -5.8, 9.7, 7.0, 7.6], "FP.CPI.TOTL.ZG": [3.7, 6.6, 5.1, 6.7, 5.6], "GC.DOD.TOTL.GD.ZS": [75, 89, 84, 83, 82], "NY.GDP.PCAP.CD": [2050, 1915, 2238, 2389, 2485]},
    "DEU": {"NY.GDP.MKTP.KD.ZG": [1.1, -3.8, 3.2, 1.8, -0.3], "FP.CPI.TOTL.ZG": [1.4, 0.4, 3.1, 6.9, 6.0], "GC.DOD.TOTL.GD.ZS": [59, 69, 69, 66, 64], "NY.GDP.PCAP.CD": [46794, 46772, 51204, 48636, 52745]},
    "BRA": {"NY.GDP.MKTP.KD.ZG": [1.2, -3.3, 4.8, 3.0, 2.9], "FP.CPI.TOTL.ZG": [3.7, 3.2, 8.3, 9.3, 4.6], "GC.DOD.TOTL.GD.ZS": [74, 87, 81, 85, 85], "NY.GDP.PCAP.CD": [8845, 6924, 7697, 8917, 10044]},
    "ARG": {"NY.GDP.MKTP.KD.ZG": [-2.0, -9.9, 10.7, 5.0, -1.6], "FP.CPI.TOTL.ZG": [53.5, 42.0, 48.4, 72.4, 133.5], "GC.DOD.TOTL.GD.ZS": [90, 103, 80, 85, 89], "NY.GDP.PCAP.CD": [9963, 8500, 10636, 13650, 13730]},
}


class MacroRepository:
    years = [2019, 2020, 2021, 2022, 2023]

    def countries(self) -> list[Country]:
        return COUNTRIES

    def indicators(self) -> list[Indicator]:
        return INDICATORS

    def observations(self, indicator_code: str, countries: list[str] | None = None) -> list[Observation]:
        selected = countries or list(SERIES)
        rows: list[Observation] = []
        for iso3 in selected:
            for year, value in zip(self.years, SERIES[iso3][indicator_code], strict=True):
                rows.append(Observation(country_iso3=iso3, indicator_code=indicator_code, year=year, value=value, source="Demo"))
        return rows

    def latest(self, indicator_code: str) -> list[Observation]:
        return [rows[-1] for rows in self._grouped(indicator_code).values()]

    def _grouped(self, indicator_code: str) -> dict[str, list[Observation]]:
        grouped: dict[str, list[Observation]] = {}
        for row in self.observations(indicator_code):
            grouped.setdefault(row.country_iso3, []).append(row)
        return grouped
