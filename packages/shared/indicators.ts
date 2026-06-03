export type IndicatorGroup =
  | "gdp"
  | "inflation"
  | "labor"
  | "external"
  | "fiscal"
  | "monetary"
  | "financial"
  | "demographics"
  | "development"
  | "energy";

export type IndicatorDefinition = {
  code: string;
  name: string;
  group: IndicatorGroup;
  unit: string;
  source: "World Bank" | "IMF" | "OECD" | "UN" | "FRED" | "ECB" | "BIS" | "Demo";
  higherIsBetter?: boolean;
};

export const INDICATORS: IndicatorDefinition[] = [
  { code: "NY.GDP.MKTP.CD", name: "GDP Current USD", group: "gdp", unit: "USD", source: "World Bank", higherIsBetter: true },
  { code: "NY.GDP.MKTP.KD", name: "GDP Constant USD", group: "gdp", unit: "2015 USD", source: "World Bank", higherIsBetter: true },
  { code: "NY.GDP.MKTP.PP.CD", name: "GDP PPP", group: "gdp", unit: "Intl USD", source: "World Bank", higherIsBetter: true },
  { code: "NY.GDP.PCAP.CD", name: "GDP per capita", group: "gdp", unit: "USD/person", source: "World Bank", higherIsBetter: true },
  { code: "NY.GDP.MKTP.KD.ZG", name: "GDP growth", group: "gdp", unit: "% YoY", source: "World Bank", higherIsBetter: true },
  { code: "FP.CPI.TOTL", name: "CPI", group: "inflation", unit: "index", source: "World Bank" },
  { code: "CORE_CPI", name: "Core CPI", group: "inflation", unit: "% YoY", source: "IMF" },
  { code: "FP.CPI.TOTL.ZG", name: "Inflation YoY", group: "inflation", unit: "% YoY", source: "World Bank" },
  { code: "INFLATION_MOM", name: "Inflation MoM", group: "inflation", unit: "% MoM", source: "IMF" },
  { code: "SL.UEM.TOTL.ZS", name: "Unemployment rate", group: "labor", unit: "% labor force", source: "World Bank" },
  { code: "SL.TLF.CACT.ZS", name: "Labor participation rate", group: "labor", unit: "% population 15+", source: "World Bank" },
  { code: "EMP_GROWTH", name: "Employment growth", group: "labor", unit: "% YoY", source: "OECD" },
  { code: "BN.CAB.XOKA.CD", name: "Current Account", group: "external", unit: "USD", source: "World Bank" },
  { code: "NE.RSB.GNFS.CD", name: "Trade Balance", group: "external", unit: "USD", source: "World Bank" },
  { code: "NE.EXP.GNFS.CD", name: "Exports", group: "external", unit: "USD", source: "World Bank" },
  { code: "NE.IMP.GNFS.CD", name: "Imports", group: "external", unit: "USD", source: "World Bank" },
  { code: "FI.RES.TOTL.CD", name: "FX Reserves", group: "external", unit: "USD", source: "World Bank" },
  { code: "GC.DOD.TOTL.GD.ZS", name: "Debt/GDP", group: "fiscal", unit: "% GDP", source: "World Bank" },
  { code: "FISCAL_BALANCE", name: "Fiscal Balance", group: "fiscal", unit: "% GDP", source: "IMF" },
  { code: "FR.INR.RINR", name: "Interest Rate", group: "monetary", unit: "%", source: "World Bank" },
  { code: "CENTRAL_BANK_RATE", name: "Central Bank Rate", group: "monetary", unit: "%", source: "ECB" },
  { code: "M1", name: "Money Supply M1", group: "monetary", unit: "local currency", source: "FRED" },
  { code: "M2", name: "Money Supply M2", group: "monetary", unit: "local currency", source: "FRED" },
  { code: "CREDIT_GROWTH", name: "Credit Growth", group: "financial", unit: "% YoY", source: "BIS" },
  { code: "BANK_ASSETS", name: "Bank Assets", group: "financial", unit: "USD", source: "BIS" },
  { code: "NPL_RATIO", name: "NPL Ratio", group: "financial", unit: "% loans", source: "IMF" },
  { code: "SP.POP.TOTL", name: "Population", group: "demographics", unit: "people", source: "World Bank" },
  { code: "SP.POP.GROW", name: "Population Growth", group: "demographics", unit: "% YoY", source: "World Bank" },
  { code: "SP.URB.TOTL.IN.ZS", name: "Urbanization Rate", group: "demographics", unit: "% population", source: "World Bank" },
  { code: "HDI", name: "HDI", group: "development", unit: "index", source: "UN", higherIsBetter: true },
  { code: "SI.POV.NAHC", name: "Poverty Rate", group: "development", unit: "% population", source: "World Bank" },
  { code: "EDU_INDEX", name: "Education Index", group: "development", unit: "index", source: "UN", higherIsBetter: true },
  { code: "EG.USE.PCAP.KG.OE", name: "Energy Consumption", group: "energy", unit: "kg oil eq/person", source: "World Bank" },
  { code: "EG.FEC.RNEW.ZS", name: "Renewable Energy Share", group: "energy", unit: "% final energy", source: "World Bank", higherIsBetter: true },
  { code: "EN.ATM.CO2E.PC", name: "CO2 Emissions", group: "energy", unit: "t/person", source: "World Bank" }
];
