from __future__ import annotations

from datetime import datetime, timedelta

from airflow.decorators import dag, task


DEFAULT_ARGS = {
    "owner": "macro-platform",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
}


@dag(
    dag_id="macro_official_data_refresh",
    default_args=DEFAULT_ARGS,
    start_date=datetime(2025, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["macro", "world-bank", "official-data"],
)
def macro_refresh():
    @task
    def extract_world_bank() -> list[str]:
        return [
            "NY.GDP.MKTP.KD.ZG",
            "FP.CPI.TOTL.ZG",
            "GC.DOD.TOTL.GD.ZS",
            "NY.GDP.PCAP.CD",
        ]

    @task
    def normalize(indicators: list[str]) -> int:
        return len(indicators)

    @task
    def load(row_count: int) -> str:
        return f"Loaded {row_count} indicator batches into TimescaleDB staging tables."

    load(normalize(extract_world_bank()))


macro_refresh()
