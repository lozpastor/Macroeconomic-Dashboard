SELECT
    country_iso3,
    indicator_code,
    time::date AS observation_date,
    value,
    source,
    frequency,
    vintage
FROM {{ source('macro', 'observations') }}
WHERE value IS NOT NULL
