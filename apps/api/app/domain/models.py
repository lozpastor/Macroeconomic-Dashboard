from pydantic import BaseModel, Field


class Country(BaseModel):
    iso3: str
    name: str
    continent: str
    region: str
    blocs: list[str] = Field(default_factory=list)
    income_group: str


class Observation(BaseModel):
    country_iso3: str
    indicator_code: str
    year: int
    value: float
    source: str
    frequency: str = "A"


class Indicator(BaseModel):
    code: str
    name: str
    category: str
    unit: str
    source: str
    higher_is_better: bool | None = None


class Insight(BaseModel):
    title: str
    narrative: str
    severity: str = "info"
    country_iso3: str | None = None
    indicator_code: str | None = None


class ForecastPoint(BaseModel):
    year: int
    value: float
    lower: float
    upper: float
    method: str
