INSERT INTO countries (iso3, name, continent, region, income_group, blocs) VALUES
('USA','United States','North America','North America','High income',ARRAY['G7','G20','OECD','USMCA','Developed']),
('CHN','China','Asia','East Asia','Upper middle income',ARRAY['G20','BRICS','Emerging']),
('IND','India','Asia','South Asia','Lower middle income',ARRAY['G20','BRICS','Emerging']),
('DEU','Germany','Europe','European Union','High income',ARRAY['EU','G7','G20','OECD','Developed']),
('BRA','Brazil','South America','Latin America','Upper middle income',ARRAY['G20','BRICS','Mercosur','Emerging']),
('ARG','Argentina','South America','Latin America','Upper middle income',ARRAY['G20','Mercosur','Emerging'])
ON CONFLICT (iso3) DO NOTHING;

INSERT INTO indicators (code, name, category, unit, source, higher_is_better) VALUES
('NY.GDP.MKTP.KD.ZG','GDP growth','GDP','% YoY','World Bank',TRUE),
('FP.CPI.TOTL.ZG','Inflation YoY','Inflation','% YoY','World Bank',FALSE),
('GC.DOD.TOTL.GD.ZS','Debt/GDP','Fiscal','% GDP','World Bank',FALSE),
('NY.GDP.PCAP.CD','GDP per capita','GDP','USD','World Bank',TRUE)
ON CONFLICT (code) DO NOTHING;
