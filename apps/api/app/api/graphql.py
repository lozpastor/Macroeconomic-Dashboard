import strawberry
from strawberry.fastapi import GraphQLRouter

from app.domain.models import Country as CountryModel
from app.domain.models import Indicator as IndicatorModel
from app.services.repository import MacroRepository

repository = MacroRepository()


@strawberry.type
class Country:
    iso3: str
    name: str
    continent: str
    region: str
    blocs: list[str]
    income_group: str

    @classmethod
    def from_model(cls, model: CountryModel) -> "Country":
        return cls(**model.model_dump())


@strawberry.type
class Indicator:
    code: str
    name: str
    category: str
    unit: str
    source: str
    higher_is_better: bool | None

    @classmethod
    def from_model(cls, model: IndicatorModel) -> "Indicator":
        return cls(**model.model_dump())


@strawberry.type
class Query:
    @strawberry.field
    def countries(self) -> list[Country]:
        return [Country.from_model(country) for country in repository.countries()]

    @strawberry.field
    def indicators(self) -> list[Indicator]:
        return [Indicator.from_model(indicator) for indicator in repository.indicators()]


graphql_router = GraphQLRouter(strawberry.Schema(query=Query))
