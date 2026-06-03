# Macroeconomic Intelligence Platform

Plataforma web profesional para explorar, comparar y monitorizar paises, regiones y bloques economicos mediante dashboards macroeconomicos interactivos.

## Stack

- Frontend: Next.js 15, TypeScript, Tailwind CSS, Zustand, React Query, ECharts.
- Backend: Python FastAPI con separacion hexagonal por dominio, servicios y API.
- Datos: PostgreSQL/TimescaleDB, Redis, SQL schema, datos demo y conectores ETL.
- ETL: Airflow DAGs, dbt models y fuentes oficiales como World Bank, IMF, OECD, FRED, ECB y BIS.
- Infraestructura: Docker Compose, Kubernetes-ready, Terraform-ready y GitHub Actions.

## Ejecucion local

```bash
npm install
npm run dev:web
```

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r apps/api/requirements.txt
uvicorn app.main:app --reload --app-dir apps/api
```

Tambien puedes levantar la plataforma completa con:

```bash
npm run compose:up
```

## Modulos

- Dashboard global con mapa choropleth, KPIs, ranking e historico.
- Comparador avanzado con radar, heatmap, scatter y bubble chart.
- Correlaciones con matriz, regresion lineal y dispersion interactiva.
- Forecasting con interfaz comun para Prophet, ARIMA y XGBoost.
- Insights automaticos por reglas estadisticas, anomalías y tendencias.
- Exportacion y alertas preparadas para integracion productiva.

La documentacion tecnica completa esta en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
