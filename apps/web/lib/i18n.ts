// Lightweight i18n for the dashboard (Spanish / English / Chinese). No external
// libraries: plain dictionaries plus a couple of helpers. The "current language"
// is also kept as a module-level value so pure formatters (period/money labels)
// can localise without threading `lang` through every call site.

import type { Frequency, MetricKey } from "./demo-data";

export type Lang = "es" | "en" | "zh";

export const languages: Array<{ code: Lang; label: string }> = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" }
];

let currentLang: Lang = "es";
export function setCurrentLang(lang: Lang) {
  currentLang = lang;
}
export function getLang(): Lang {
  return currentLang;
}

export function numberLocale(lang: Lang): string {
  return lang === "en" ? "en-US" : lang === "zh" ? "zh-CN" : "es-ES";
}

export const MONTHS: Record<Lang, string[]> = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
};

// Money magnitude suffixes (10^12 / 10^9 / 10^6).
export const MONEY_SUFFIX: Record<Lang, { t: string; b: string; m: string }> = {
  es: { t: " B", b: " mil M", m: " M" },
  en: { t: " T", b: " bn", m: " M" },
  zh: { t: " 万亿", b: " 十亿", m: " 百万" }
};

export function noData(lang: Lang = currentLang): string {
  return lang === "en" ? "n/a" : lang === "zh" ? "无数据" : "s/d";
}

// ---------------------------------------------------------------------------
// Static UI strings
// ---------------------------------------------------------------------------

type Vars = Record<string, string | number>;

const UI: Record<Lang, Record<string, string>> = {
  es: {
    searchPlaceholder: "Buscar pais...",
    clearSearch: "Limpiar busqueda",
    noDataSelection: "Sin datos para esta seleccion.",
    infoAria: "Informacion del indicador",
    insightsFallback: "Sin datos suficientes para generar insights.",
    prevInsight: "Insight anterior",
    nextInsight: "Insight siguiente",
    prevPeriod: "Periodo anterior",
    nextPeriod: "Periodo siguiente",
    about: "Acerca de",
    dataSources: "Fuentes de datos",
    aboutFooter: "{n} paises · actualizado {date}",
    comparison: "Comparativa",
    history: "Evolucion historica",
    compareHint: "Selecciona paises en la lista o el mapa para compararlos (hasta {n}). Mostrando el top actual.",
    fxHint: "Cada divisa frente a la moneda base seleccionada (1 {cur} = X). Variacion del ultimo mes. Fuente: tipos de referencia del BCE (diarios).",
    indicesHint: "Principales indices bursatiles con la bandera del pais (o de la UE para los paneuropeos). Variacion del ultimo mes. Fuente: Yahoo Finance (diario).",
    against: "Frente a",
    tradeTitle: "Valores de comercio por categoria",
    category: "Categoria",
    allBreakdown: "Todas (desglose por pais)",
    noTradePeriod: "Sin datos de comercio para este periodo.",
    rankingCountries: "ranking de paises",
    comparisonSelected: "comparativa de paises seleccionados",
    comparisonByCategoryOf: "Comparativa por categoria de",
    noCategorySelected: "Sin datos por categoria para los paises seleccionados.",
    exports: "Exportaciones",
    imports: "Importaciones",
    balanceExpImp: "Balanza (exp. - imp.)",
    tradeBalance: "Balanza comercial",
    exportsShort: "Export.",
    importsShort: "Import.",
    balanceShort: "Balanza",
    byProductCategory: "{flow} por categoria de producto. Selecciona varios paises para comparar.",
    evolution: "Evolucion {adj} · {flow} (valor en {cur})",
    selectTradeCountry: "Selecciona un pais con datos de comercio.",
    valueIn: "valor en",
    continent: "Continente",
    average: "Media",
    highest: "Mayor",
    lowest: "Menor",
    resetSelection: "Reset seleccion",
    seeWorld: "Ver el mundo",
    world: "Mundo",
    countries: "Paises",
    period: "Periodo",
    variation: "Variacion",
    value: "Valor",
    total: "Total",
    insightsAuto: "Insights automaticos",
    insightsAutoDesc: "· generados a partir de los datos en pantalla",
    loading: "Cargando datos macroeconomicos...",
    loadError: "No se pudieron cargar los datos.",
    selectedShort: "{n} sel.",
    language: "Idioma",
    currency: "Moneda",
    pctGdp: "% PIB"
  },
  en: {
    searchPlaceholder: "Search country...",
    clearSearch: "Clear search",
    noDataSelection: "No data for this selection.",
    infoAria: "Indicator information",
    insightsFallback: "Not enough data to generate insights.",
    prevInsight: "Previous insight",
    nextInsight: "Next insight",
    prevPeriod: "Previous period",
    nextPeriod: "Next period",
    about: "About",
    dataSources: "Data sources",
    aboutFooter: "{n} countries · updated {date}",
    comparison: "Comparison",
    history: "Historical trend",
    compareHint: "Select countries in the list or the map to compare them (up to {n}). Showing the current top.",
    fxHint: "Each currency against the selected base currency (1 {cur} = X). Last-month change. Source: ECB reference rates (daily).",
    indicesHint: "Major stock indices with the flag of the country (or the EU for pan-European ones). Last-month change. Source: Yahoo Finance (daily).",
    against: "Against",
    tradeTitle: "Trade values by category",
    category: "Category",
    allBreakdown: "All (breakdown by country)",
    noTradePeriod: "No trade data for this period.",
    rankingCountries: "country ranking",
    comparisonSelected: "comparison of selected countries",
    comparisonByCategoryOf: "Comparison by category of",
    noCategorySelected: "No category data for the selected countries.",
    exports: "Exports",
    imports: "Imports",
    balanceExpImp: "Balance (exp. - imp.)",
    tradeBalance: "Trade balance",
    exportsShort: "Exp.",
    importsShort: "Imp.",
    balanceShort: "Balance",
    byProductCategory: "{flow} by product category. Select several countries to compare.",
    evolution: "{adj} trend · {flow} (value in {cur})",
    selectTradeCountry: "Select a country with trade data.",
    valueIn: "value in",
    continent: "Continent",
    average: "Average",
    highest: "Highest",
    lowest: "Lowest",
    resetSelection: "Reset selection",
    seeWorld: "See the world",
    world: "World",
    countries: "Countries",
    period: "Period",
    variation: "Share",
    value: "Value",
    total: "Total",
    insightsAuto: "Automatic insights",
    insightsAutoDesc: "· generated from the data on screen",
    loading: "Loading macroeconomic data...",
    loadError: "Could not load the data.",
    selectedShort: "{n} sel.",
    language: "Language",
    currency: "Currency",
    pctGdp: "% GDP"
  },
  zh: {
    searchPlaceholder: "搜索国家...",
    clearSearch: "清除搜索",
    noDataSelection: "此选择没有数据。",
    infoAria: "指标信息",
    insightsFallback: "数据不足，无法生成洞察。",
    prevInsight: "上一条洞察",
    nextInsight: "下一条洞察",
    prevPeriod: "上一期",
    nextPeriod: "下一期",
    about: "关于",
    dataSources: "数据来源",
    aboutFooter: "{n} 个国家 · 更新于 {date}",
    comparison: "对比",
    history: "历史趋势",
    compareHint: "在列表或地图中选择国家进行对比（最多 {n} 个）。显示当前排名靠前的国家。",
    fxHint: "各货币相对所选基准货币（1 {cur} = X）。最近一个月变动。来源：欧洲央行参考汇率（每日）。",
    indicesHint: "主要股票指数，附所属国家旗帜（泛欧指数使用欧盟旗帜）。最近一个月变动。来源：Yahoo Finance（每日）。",
    against: "兑",
    tradeTitle: "按类别的贸易额",
    category: "类别",
    allBreakdown: "全部（按国家细分）",
    noTradePeriod: "该时期没有贸易数据。",
    rankingCountries: "国家排名",
    comparisonSelected: "所选国家对比",
    comparisonByCategoryOf: "按类别对比：",
    noCategorySelected: "所选国家没有类别数据。",
    exports: "出口",
    imports: "进口",
    balanceExpImp: "差额（出口 - 进口）",
    tradeBalance: "贸易差额",
    exportsShort: "出口",
    importsShort: "进口",
    balanceShort: "差额",
    byProductCategory: "按产品类别的{flow}。选择多个国家进行对比。",
    evolution: "{adj}趋势 · {flow}（以 {cur} 计）",
    selectTradeCountry: "请选择一个有贸易数据的国家。",
    valueIn: "计价单位",
    continent: "大洲",
    average: "平均",
    highest: "最高",
    lowest: "最低",
    resetSelection: "重置选择",
    seeWorld: "查看全球",
    world: "全球",
    countries: "国家",
    period: "时期",
    variation: "占比",
    value: "数值",
    total: "总计",
    insightsAuto: "自动洞察",
    insightsAutoDesc: "· 根据屏幕上的数据生成",
    loading: "正在加载宏观经济数据...",
    loadError: "无法加载数据。",
    selectedShort: "已选 {n}",
    language: "语言",
    currency: "货币",
    pctGdp: "% GDP"
  }
};

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

// ---------------------------------------------------------------------------
// Domain label dictionaries (keyed by the existing config keys)
// ---------------------------------------------------------------------------

const CATEGORIES: Record<Lang, Record<string, string>> = {
  es: { growth: "Crecimiento", inflation: "Inflacion y Precios", labour: "Mercado Laboral", monetary: "Politica Monetaria", trade: "Comercio y Mercados", fiscal: "Sostenibilidad Fiscal" },
  en: { growth: "Growth", inflation: "Inflation & Prices", labour: "Labour Market", monetary: "Monetary Policy", trade: "Trade & Markets", fiscal: "Fiscal Sustainability" },
  zh: { growth: "经济增长", inflation: "通胀与物价", labour: "劳动力市场", monetary: "货币政策", trade: "贸易与市场", fiscal: "财政可持续性" }
};

const TABS: Record<Lang, Record<string, string>> = {
  es: {
    gdp: "Producto Interior Bruto", industrial: "Produccion industrial", retail: "Ventas al por menor",
    cpi: "IPC General", cpiCore: "IPC Subyacente", oil: "Petroleo",
    unemployment: "Tasa de desempleo", cci: "Confianza del consumidor",
    interestRates: "Tipos de interes", bonds: "Bonos 10 anos", riskPremium: "Prima de riesgo",
    exchange: "Tipo de cambio", tradeBalance: "Balanza comercial", indices: "Indices bursatiles",
    publicDebt: "Deuda publica", deficit: "Deficit publico", countryRisk: "Riesgo pais"
  },
  en: {
    gdp: "Gross Domestic Product", industrial: "Industrial Production", retail: "Retail Sales",
    cpi: "Headline CPI", cpiCore: "Core CPI", oil: "Oil",
    unemployment: "Unemployment Rate", cci: "Consumer Confidence",
    interestRates: "Interest Rates", bonds: "10-Year Bonds", riskPremium: "Risk Premium",
    exchange: "Exchange Rate", tradeBalance: "Trade Balance", indices: "Stock Indices",
    publicDebt: "Public Debt", deficit: "Public Deficit", countryRisk: "Country Risk"
  },
  zh: {
    gdp: "国内生产总值", industrial: "工业生产", retail: "零售销售",
    cpi: "整体CPI", cpiCore: "核心CPI", oil: "石油",
    unemployment: "失业率", cci: "消费者信心",
    interestRates: "利率", bonds: "10年期国债", riskPremium: "风险溢价",
    exchange: "汇率", tradeBalance: "贸易差额", indices: "股票指数",
    publicDebt: "公共债务", deficit: "财政赤字", countryRisk: "国家风险"
  }
};

const DESCS: Record<Lang, Record<string, string>> = {
  es: {
    gdp: "Valor de todos los bienes y servicios producidos. Se muestra como crecimiento interanual (%) y PIB per capita (USD).",
    industrial: "Variacion interanual de la produccion de fabricas, mineria y energia. Adelanta el ciclo economico.",
    retail: "Variacion interanual de las ventas minoristas. Refleja la fortaleza del consumo de los hogares.",
    cpi: "Inflacion general: variacion interanual del nivel de precios al consumo. Objetivo habitual de los bancos centrales: ~2%.",
    cpiCore: "Inflacion subyacente: excluye alimentos y energia (mas volatiles). Mide la tendencia de fondo de los precios.",
    oil: "Precio diario del crudo Brent (referencia europea) y WTI (referencia EE.UU.) en dolares por barril.",
    unemployment: "Porcentaje de la poblacion activa sin empleo y que busca trabajo. Tasa armonizada, comparable entre paises.",
    cci: "Indice de sentimiento de los hogares sobre la economia. Por encima de 100 indica optimismo; por debajo, pesimismo.",
    interestRates: "Tipo de interes oficial de la Fed (EE.UU.) y del BCE (eurozona). Principal herramienta de politica monetaria.",
    bonds: "Rendimiento de la deuda publica a 10 anos. Sube cuando los inversores exigen mas rentabilidad por prestar al Estado.",
    riskPremium: "Diferencial del bono a 10 anos frente a Alemania, en puntos basicos. Mide el riesgo percibido del pais.",
    exchange: "Cotizacion de cada divisa frente a la moneda base seleccionable (p.ej. USD/EUR). Tipos de referencia diarios del BCE.",
    tradeBalance: "Diferencia entre exportaciones e importaciones. Se muestra en % del PIB y en valor por categoria de producto.",
    indices: "Principales indices bursatiles mundiales, con la bandera del pais o region. Cierre diario en puntos.",
    publicDebt: "Deuda del conjunto de las administraciones publicas en % del PIB. Mide el endeudamiento del Estado.",
    deficit: "Saldo de las cuentas publicas en % del PIB. Valores negativos indican deficit (se gasta mas de lo que se ingresa).",
    countryRisk: "Prima de riesgo del pais (diferencial del bono a 10 anos frente a Alemania) en puntos basicos."
  },
  en: {
    gdp: "Value of all goods and services produced. Shown as year-on-year growth (%) and GDP per capita (USD).",
    industrial: "Year-on-year change in factory, mining and energy output. Leads the economic cycle.",
    retail: "Year-on-year change in retail sales. Reflects the strength of household consumption.",
    cpi: "Headline inflation: year-on-year change in consumer prices. Usual central-bank target: ~2%.",
    cpiCore: "Core inflation: excludes food and energy (more volatile). Measures the underlying price trend.",
    oil: "Daily price of Brent crude (European benchmark) and WTI (US benchmark) in dollars per barrel.",
    unemployment: "Share of the labour force without a job and seeking work. Harmonised rate, comparable across countries.",
    cci: "Index of household sentiment about the economy. Above 100 signals optimism; below, pessimism.",
    interestRates: "Official policy rate of the Fed (US) and the ECB (euro area). The main monetary-policy tool.",
    bonds: "Yield on 10-year government debt. Rises when investors demand more return to lend to the state.",
    riskPremium: "Spread of the 10-year bond versus Germany, in basis points. Measures the country's perceived risk.",
    exchange: "Quote of each currency against the selectable base currency (e.g. USD/EUR). ECB daily reference rates.",
    tradeBalance: "Difference between exports and imports. Shown as % of GDP and as value by product category.",
    indices: "Major world stock indices, with the flag of the country or region. Daily close in points.",
    publicDebt: "General government debt as % of GDP. Measures the state's indebtedness.",
    deficit: "Public accounts balance as % of GDP. Negative values indicate a deficit (spending exceeds revenue).",
    countryRisk: "Country risk premium (10-year bond spread versus Germany) in basis points."
  },
  zh: {
    gdp: "所有生产的商品和服务的价值。以同比增长（%）和人均GDP（美元）显示。",
    industrial: "工厂、采矿和能源产出的同比变化。领先于经济周期。",
    retail: "零售销售的同比变化。反映家庭消费的强弱。",
    cpi: "整体通胀：消费价格的同比变化。央行通常目标：约2%。",
    cpiCore: "核心通胀：剔除波动较大的食品和能源。衡量价格的基本趋势。",
    oil: "布伦特原油（欧洲基准）和WTI（美国基准）的每日价格，单位为美元/桶。",
    unemployment: "劳动力中失业并正在找工作的比例。统一口径，可跨国比较。",
    cci: "家庭对经济信心的指数。高于100表示乐观，低于则表示悲观。",
    interestRates: "美联储（美国）和欧洲央行（欧元区）的官方政策利率。货币政策的主要工具。",
    bonds: "10年期政府债券收益率。当投资者要求更高回报时上升。",
    riskPremium: "10年期国债相对德国的利差，以基点计。衡量国家的感知风险。",
    exchange: "各货币相对可选基准货币的报价（如 USD/EUR）。欧洲央行每日参考汇率。",
    tradeBalance: "出口与进口之差。以占GDP百分比和按产品类别的数值显示。",
    indices: "主要的全球股票指数，附所属国家或地区旗帜。每日收盘点数。",
    publicDebt: "广义政府债务占GDP的百分比。衡量国家的负债程度。",
    deficit: "公共账户余额占GDP的百分比。负值表示赤字（支出超过收入）。",
    countryRisk: "国家风险溢价（10年期国债相对德国的利差），以基点计。"
  }
};

const METRIC_SHORT: Record<Lang, Partial<Record<MetricKey, string>>> = {
  es: {
    gdp: "Crecimiento", gdpPerCapita: "Per capita", industrial: "Produccion", retail: "Ventas",
    cpi: "IPC", cpiCore: "Subyacente", oilBrent: "Brent", oilWti: "WTI",
    unemployment: "Desempleo", cci: "Confianza", fedRate: "Fed Funds", ecbRate: "BCE MRR",
    bondYield: "Rendimiento", riskPremium: "Prima", exchangeRate: "Tipo de cambio",
    tradeBalance: "Balanza", indices: "Indices", publicDebt: "Deuda", deficit: "Deficit", countryRisk: "Riesgo"
  },
  en: {
    gdp: "Growth", gdpPerCapita: "Per capita", industrial: "Output", retail: "Sales",
    cpi: "CPI", cpiCore: "Core", oilBrent: "Brent", oilWti: "WTI",
    unemployment: "Unemployment", cci: "Confidence", fedRate: "Fed Funds", ecbRate: "ECB MRR",
    bondYield: "Yield", riskPremium: "Premium", exchangeRate: "Exchange rate",
    tradeBalance: "Balance", indices: "Indices", publicDebt: "Debt", deficit: "Deficit", countryRisk: "Risk"
  },
  zh: {
    gdp: "增长", gdpPerCapita: "人均", industrial: "产出", retail: "销售",
    cpi: "CPI", cpiCore: "核心", oilBrent: "布伦特", oilWti: "WTI",
    unemployment: "失业", cci: "信心", fedRate: "联邦基金", ecbRate: "欧央行",
    bondYield: "收益率", riskPremium: "溢价", exchangeRate: "汇率",
    tradeBalance: "差额", indices: "指数", publicDebt: "债务", deficit: "赤字", countryRisk: "风险"
  }
};

const METRIC_LABEL: Record<Lang, Partial<Record<MetricKey, string>>> = {
  es: {
    gdp: "Crecimiento del PIB", gdpPerCapita: "PIB per capita", industrial: "Produccion industrial", retail: "Ventas al por menor",
    cpi: "IPC general (var. interanual)", cpiCore: "IPC subyacente (sin alimentos ni energia)", oilBrent: "Petroleo Brent", oilWti: "Petroleo WTI",
    unemployment: "Tasa de desempleo armonizada", cci: "Indice de confianza del consumidor",
    fedRate: "Tipo Fed Funds (EE.UU.)", ecbRate: "Tipo principal BCE", bondYield: "Rendimiento bonos 10 anos", riskPremium: "Prima de riesgo vs Alemania",
    exchangeRate: "Tipo de cambio por pais", tradeBalance: "Balanza comercial (% del PIB)", indices: "Indices bursatiles",
    publicDebt: "Deuda publica (% del PIB)", deficit: "Deficit publico (% del PIB)", countryRisk: "Riesgo pais (prima vs Alemania)"
  },
  en: {
    gdp: "GDP growth", gdpPerCapita: "GDP per capita", industrial: "Industrial production", retail: "Retail sales",
    cpi: "Headline CPI (y/y change)", cpiCore: "Core CPI (ex food & energy)", oilBrent: "Brent crude", oilWti: "WTI crude",
    unemployment: "Harmonised unemployment rate", cci: "Consumer confidence index",
    fedRate: "Fed Funds rate (US)", ecbRate: "ECB main rate", bondYield: "10-year bond yield", riskPremium: "Risk premium vs Germany",
    exchangeRate: "Exchange rate by country", tradeBalance: "Trade balance (% of GDP)", indices: "Stock indices",
    publicDebt: "Public debt (% of GDP)", deficit: "Public deficit (% of GDP)", countryRisk: "Country risk (premium vs Germany)"
  },
  zh: {
    gdp: "GDP增长", gdpPerCapita: "人均GDP", industrial: "工业生产", retail: "零售销售",
    cpi: "整体CPI（同比）", cpiCore: "核心CPI（不含食品与能源）", oilBrent: "布伦特原油", oilWti: "WTI原油",
    unemployment: "统一失业率", cci: "消费者信心指数",
    fedRate: "联邦基金利率（美国）", ecbRate: "欧洲央行主要利率", bondYield: "10年期国债收益率", riskPremium: "相对德国的风险溢价",
    exchangeRate: "各国汇率", tradeBalance: "贸易差额（占GDP%）", indices: "股票指数",
    publicDebt: "公共债务（占GDP%）", deficit: "财政赤字（占GDP%）", countryRisk: "国家风险（相对德国溢价）"
  }
};

const CONTINENTS: Record<Lang, Record<string, string>> = {
  es: { Africa: "Africa", "North America": "Norteamerica", "South America": "Sudamerica", Asia: "Asia", Europe: "Europa", Oceania: "Oceania" },
  en: { Africa: "Africa", "North America": "North America", "South America": "South America", Asia: "Asia", Europe: "Europe", Oceania: "Oceania" },
  zh: { Africa: "非洲", "North America": "北美洲", "South America": "南美洲", Asia: "亚洲", Europe: "欧洲", Oceania: "大洋洲" }
};

const FREQ: Record<Lang, Record<Frequency, { short: string; adj: string }>> = {
  es: { A: { short: "Anual", adj: "anual" }, Q: { short: "Trimestral", adj: "trimestral" }, M: { short: "Mensual", adj: "mensual" }, D: { short: "Diario", adj: "diario" } },
  en: { A: { short: "Annual", adj: "annual" }, Q: { short: "Quarterly", adj: "quarterly" }, M: { short: "Monthly", adj: "monthly" }, D: { short: "Daily", adj: "daily" } },
  zh: { A: { short: "年度", adj: "年度" }, Q: { short: "季度", adj: "季度" }, M: { short: "月度", adj: "月度" }, D: { short: "日度", adj: "日度" } }
};

const TRADE_CATS: Record<Lang, Record<string, string>> = {
  es: {
    food: "Alimentos y bebidas", fuels: "Combustibles y energia", minerals: "Minerales y metales",
    chemicals: "Quimicos y farmacia", plastics: "Plasticos y caucho", wood: "Madera, papel y derivados",
    textiles: "Textiles y calzado", preciousMetals: "Metales preciosos y joyeria", machinery: "Maquinaria y electronica",
    transport: "Material de transporte", instruments: "Instrumentos y optica", other: "Otros"
  },
  en: {
    food: "Food & beverages", fuels: "Fuels & energy", minerals: "Minerals & metals",
    chemicals: "Chemicals & pharma", plastics: "Plastics & rubber", wood: "Wood, paper & products",
    textiles: "Textiles & footwear", preciousMetals: "Precious metals & jewellery", machinery: "Machinery & electronics",
    transport: "Transport equipment", instruments: "Instruments & optics", other: "Other"
  },
  zh: {
    food: "食品与饮料", fuels: "燃料与能源", minerals: "矿产与金属",
    chemicals: "化工与制药", plastics: "塑料与橡胶", wood: "木材、纸及制品",
    textiles: "纺织与鞋类", preciousMetals: "贵金属与珠宝", machinery: "机械与电子",
    transport: "运输设备", instruments: "仪器与光学", other: "其他"
  }
};

const CURRENCY: Record<Lang, Record<string, string>> = {
  es: { EUR: "Euro", USD: "Dolar EE.UU.", GBP: "Libra", JPY: "Yen", CNY: "Yuan", CHF: "Franco suizo" },
  en: { EUR: "Euro", USD: "US Dollar", GBP: "Pound", JPY: "Yen", CNY: "Yuan", CHF: "Swiss Franc" },
  zh: { EUR: "欧元", USD: "美元", GBP: "英镑", JPY: "日元", CNY: "人民币", CHF: "瑞士法郎" }
};

// ---------------------------------------------------------------------------
// Translator factory
// ---------------------------------------------------------------------------

export type Translator = ReturnType<typeof createT>;

export function createT(lang: Lang) {
  return {
    lang,
    t: (key: string, vars?: Vars) => interpolate(UI[lang][key] ?? UI.es[key] ?? key, vars),
    cat: (key: string) => CATEGORIES[lang][key] ?? key,
    tab: (key: string) => TABS[lang][key] ?? key,
    tabDesc: (key: string) => DESCS[lang][key] ?? "",
    mShort: (key: MetricKey) => METRIC_SHORT[lang][key] ?? key,
    mLabel: (key: MetricKey) => METRIC_LABEL[lang][key] ?? key,
    continent: (key: string) => CONTINENTS[lang][key] ?? key,
    freqShort: (f: Frequency) => FREQ[lang][f].short,
    freqAdj: (f: Frequency) => FREQ[lang][f].adj,
    curLabel: (code: string) => CURRENCY[lang][code] ?? code,
    tradeCat: (key: string) => TRADE_CATS[lang][key] ?? key
  };
}
