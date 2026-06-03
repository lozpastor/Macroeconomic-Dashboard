# Arquitectura Tecnica

## Vision

MacroScope Intelligence esta planteado como una plataforma SaaS de inteligencia macroeconomica global para economistas, analistas financieros, bancos, consultoras y organismos publicos. La arquitectura separa experiencia de usuario, API, dominio analitico, ingesta de datos, persistencia e infraestructura.

## Capas

### Frontend

- `apps/web`: Next.js 15, TypeScript, Tailwind CSS, Zustand y React Query.
- Visualizacion: Apache ECharts para series, radar, scatter, regresion y forecasting.
- Futuro mapa productivo: Mapbox GL + Deck.gl para choropleth global con zoom, pan, tooltips, percentiles y escalas lineal/logaritmica.
- UX: layout de workspace financiero, navegacion lateral, header de busqueda, modo claro/oscuro, KPI cards, ranking, comparador, correlaciones, forecasts e insights.

### Backend

- `apps/api`: FastAPI.
- Dominio: `Country`, `Indicator`, `Observation`, `Insight`, `ForecastPoint`.
- Servicios: repositorio, analytics, insights y forecasting.
- API REST: paises, indicadores, observaciones, insights, correlaciones y forecast.
- GraphQL queda previsto mediante `strawberry-graphql` para exploracion flexible de datos.

### Datos

- PostgreSQL + TimescaleDB para series temporales macroeconomicas.
- Redis para cache de consultas, snapshots y jobs.
- Modelo base:
  - `countries`
  - `indicators`
  - `observations`
  - `alerts`
  - `latest_observations`

### ETL

- `etl/connectors.py`: conectores asincronos para proveedores oficiales, empezando por World Bank.
- `etl/airflow/dags/macro_refresh.py`: DAG diario de refresco.
- `etl/dbt/macroeconomic`: transformaciones y tests de calidad.

## Fuentes oficiales

Prioridad por proveedor:

- World Bank API para PIB, inflacion, empleo, poblacion, comercio, energia y desarrollo.
- IMF Data API para sector fiscal, balanza de pagos, tipos y series especializadas.
- OECD API para paises miembros, empleo, productividad y cuentas nacionales.
- UN Data / UNDP para demografia, HDI y desarrollo.
- FRED y ECB para tipos, dinero y series de alta frecuencia.
- BIS para sistema financiero, credito, activos bancarios y NPL.

## Agrupaciones

Las agrupaciones se modelan como `blocs` en `countries` y permiten UE, G7, G20, BRICS, OECD, ASEAN, Mercosur, USMCA, desarrollados, emergentes y bajos ingresos. En produccion conviene mantener una tabla `country_groups` versionada para trazabilidad historica.

## Insights automaticos

La primera version combina:

- Reglas estadisticas: maximos/minimos por region, desviacion frente a media/mediana y percentiles.
- Anomalias: z-score, IQR y variaciones interanuales extremas.
- Comparativas: pais contra region, bloque o mundo.
- Forecast y sensibilidad: deteccion de cambios de tendencia.

## Forecasting

Interfaz comun por metodo:

- ARIMA para series macro anuales y trimestrales.
- Prophet para tendencias con estacionalidad y cambios de regimen.
- XGBoost para modelos con variables exogenas.

La implementacion demo usa regresion lineal como fallback ligero, manteniendo el contrato de respuesta con intervalos de confianza.

## Exportacion y alertas

Exportacion prevista:

- CSV/Excel desde API.
- PNG desde charts cliente.
- PDF y PowerPoint mediante jobs backend.

Alertas:

- Reglas por indicador, pais, operador y umbral.
- Canales preparados: email, Slack y Teams.

## Rendimiento

- Cache Redis por consulta agregada.
- Revalidacion por disponibilidad del proveedor.
- Lazy loading de visualizaciones.
- Virtualizacion para rankings largos.
- Materialized views para ultimos datos y comparativas frecuentes.

## Seguridad y produccion

- Autenticacion OIDC/SAML para clientes enterprise.
- Row-level security para organizaciones.
- Rate limiting por API key.
- Auditoria de consultas y descargas.
- Secrets gestionados por plataforma cloud.

## Roadmap recomendado

1. Conectar World Bank completo con paginacion y normalizacion ISO3.
2. Sustituir datos demo frontend por React Query contra FastAPI.
3. Implementar Mapbox/Deck.gl con geometria Natural Earth o Mapbox tiles.
4. Añadir tabla versionada de grupos economicos.
5. Implementar jobs de forecast por indicador y pais.
6. Añadir exportaciones reales y alertas salientes.
7. Endurecer CI/CD, observabilidad y despliegue cloud.
