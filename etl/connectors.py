from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class ProviderResponse:
    provider: str
    indicator: str
    rows: list[dict[str, Any]]


class WorldBankClient:
    def __init__(self, base_url: str = "https://api.worldbank.org/v2"):
        self.base_url = base_url.rstrip("/")

    async def fetch_indicator(self, indicator: str, countries: str = "all", per_page: int = 20000) -> ProviderResponse:
        url = f"{self.base_url}/country/{countries}/indicator/{indicator}"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, params={"format": "json", "per_page": per_page})
            response.raise_for_status()
        payload = response.json()
        rows = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
        return ProviderResponse(provider="World Bank", indicator=indicator, rows=rows)


class ProviderRegistry:
    def __init__(self):
        self.world_bank = WorldBankClient()

    async def fetch(self, provider: str, indicator: str) -> ProviderResponse:
        if provider == "World Bank":
            return await self.world_bank.fetch_indicator(indicator)
        raise ValueError(f"Unsupported provider: {provider}")
