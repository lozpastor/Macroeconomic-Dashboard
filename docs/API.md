# API

Base local: `http://localhost:8000/api/v1`

## Endpoints

- `GET /countries`: catalogo de paises.
- `GET /indicators`: catalogo de indicadores.
- `GET /observations?indicator=NY.GDP.MKTP.KD.ZG&countries=USA&countries=DEU`: serie historica filtrada.
- `GET /insights`: insights automaticos.
- `GET /correlations?x_indicator=FP.CPI.TOTL.ZG&y_indicator=NY.GDP.MKTP.KD.ZG`: correlacion y regresion.
- `GET /forecast?country=USA&indicator=NY.GDP.MKTP.KD.ZG&horizon=3&method=arima`: prediccion.

## Contratos clave

`Observation`

```json
{
  "country_iso3": "USA",
  "indicator_code": "NY.GDP.MKTP.KD.ZG",
  "year": 2023,
  "value": 2.5,
  "source": "Demo",
  "frequency": "A"
}
```

`ForecastPoint`

```json
{
  "year": 2026,
  "value": 2.1,
  "lower": 1.7,
  "upper": 2.5,
  "method": "arima"
}
```
