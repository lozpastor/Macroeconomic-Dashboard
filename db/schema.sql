CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS countries (
    iso3 CHAR(3) PRIMARY KEY,
    name TEXT NOT NULL,
    continent TEXT NOT NULL,
    region TEXT NOT NULL,
    income_group TEXT NOT NULL,
    blocs TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS indicators (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    source TEXT NOT NULL,
    higher_is_better BOOLEAN
);

CREATE TABLE IF NOT EXISTS observations (
    time DATE NOT NULL,
    country_iso3 CHAR(3) NOT NULL REFERENCES countries(iso3),
    indicator_code TEXT NOT NULL REFERENCES indicators(code),
    value DOUBLE PRECISION NOT NULL,
    source TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'A',
    vintage TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (time, country_iso3, indicator_code, source)
);

SELECT create_hypertable('observations', 'time', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    country_iso3 CHAR(3),
    indicator_code TEXT NOT NULL,
    operator TEXT NOT NULL CHECK (operator IN ('>', '>=', '<', '<=', '=')),
    threshold DOUBLE PRECISION NOT NULL,
    channels TEXT[] NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE MATERIALIZED VIEW IF NOT EXISTS latest_observations AS
SELECT DISTINCT ON (country_iso3, indicator_code)
    country_iso3,
    indicator_code,
    time,
    value,
    source
FROM observations
ORDER BY country_iso3, indicator_code, time DESC, vintage DESC;
