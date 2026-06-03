export type CountryPoint = {
  iso3: string;
  name: string;
  region: string;
  bloc: string[];
  latest: Record<string, number>;
  history: Array<{ year: number; gdpGrowth: number; inflation: number; debt: number; gdpPerCapita: number }>;
};

export const countries: CountryPoint[] = [
  {
    iso3: "USA",
    name: "United States",
    region: "North America",
    bloc: ["G7", "G20", "OECD", "USMCA", "Developed"],
    latest: { gdpGrowth: 2.8, inflation: 3.1, debt: 122, gdpPerCapita: 81695, unemployment: 3.9, currentAccount: -3.0, renewable: 13.7 },
    history: [
      { year: 2019, gdpGrowth: 2.3, inflation: 1.8, debt: 108, gdpPerCapita: 65120 },
      { year: 2020, gdpGrowth: -2.2, inflation: 1.2, debt: 132, gdpPerCapita: 63530 },
      { year: 2021, gdpGrowth: 5.8, inflation: 4.7, debt: 126, gdpPerCapita: 70248 },
      { year: 2022, gdpGrowth: 1.9, inflation: 8.0, debt: 121, gdpPerCapita: 76399 },
      { year: 2023, gdpGrowth: 2.5, inflation: 4.1, debt: 122, gdpPerCapita: 81695 }
    ]
  },
  {
    iso3: "CHN",
    name: "China",
    region: "East Asia",
    bloc: ["G20", "BRICS", "Emerging"],
    latest: { gdpGrowth: 5.2, inflation: 0.2, debt: 83, gdpPerCapita: 12614, unemployment: 5.2, currentAccount: 1.5, renewable: 15.4 },
    history: [
      { year: 2019, gdpGrowth: 6.0, inflation: 2.9, debt: 57, gdpPerCapita: 10144 },
      { year: 2020, gdpGrowth: 2.2, inflation: 2.4, debt: 67, gdpPerCapita: 10409 },
      { year: 2021, gdpGrowth: 8.4, inflation: 0.9, debt: 72, gdpPerCapita: 12617 },
      { year: 2022, gdpGrowth: 3.0, inflation: 2.0, debt: 77, gdpPerCapita: 12720 },
      { year: 2023, gdpGrowth: 5.2, inflation: 0.2, debt: 83, gdpPerCapita: 12614 }
    ]
  },
  {
    iso3: "IND",
    name: "India",
    region: "South Asia",
    bloc: ["G20", "BRICS", "Emerging"],
    latest: { gdpGrowth: 7.6, inflation: 5.6, debt: 82, gdpPerCapita: 2485, unemployment: 4.2, currentAccount: -1.2, renewable: 11.8 },
    history: [
      { year: 2019, gdpGrowth: 3.9, inflation: 3.7, debt: 75, gdpPerCapita: 2050 },
      { year: 2020, gdpGrowth: -5.8, inflation: 6.6, debt: 89, gdpPerCapita: 1915 },
      { year: 2021, gdpGrowth: 9.7, inflation: 5.1, debt: 84, gdpPerCapita: 2238 },
      { year: 2022, gdpGrowth: 7.0, inflation: 6.7, debt: 83, gdpPerCapita: 2389 },
      { year: 2023, gdpGrowth: 7.6, inflation: 5.6, debt: 82, gdpPerCapita: 2485 }
    ]
  },
  {
    iso3: "DEU",
    name: "Germany",
    region: "Europe",
    bloc: ["EU", "G7", "G20", "OECD", "Developed"],
    latest: { gdpGrowth: -0.3, inflation: 6.0, debt: 64, gdpPerCapita: 52745, unemployment: 3.1, currentAccount: 5.9, renewable: 20.8 },
    history: [
      { year: 2019, gdpGrowth: 1.1, inflation: 1.4, debt: 59, gdpPerCapita: 46794 },
      { year: 2020, gdpGrowth: -3.8, inflation: 0.4, debt: 69, gdpPerCapita: 46772 },
      { year: 2021, gdpGrowth: 3.2, inflation: 3.1, debt: 69, gdpPerCapita: 51204 },
      { year: 2022, gdpGrowth: 1.8, inflation: 6.9, debt: 66, gdpPerCapita: 48636 },
      { year: 2023, gdpGrowth: -0.3, inflation: 6.0, debt: 64, gdpPerCapita: 52745 }
    ]
  },
  {
    iso3: "BRA",
    name: "Brazil",
    region: "Latin America",
    bloc: ["G20", "BRICS", "Mercosur", "Emerging"],
    latest: { gdpGrowth: 2.9, inflation: 4.6, debt: 85, gdpPerCapita: 10044, unemployment: 7.8, currentAccount: -1.3, renewable: 48.9 },
    history: [
      { year: 2019, gdpGrowth: 1.2, inflation: 3.7, debt: 74, gdpPerCapita: 8845 },
      { year: 2020, gdpGrowth: -3.3, inflation: 3.2, debt: 87, gdpPerCapita: 6924 },
      { year: 2021, gdpGrowth: 4.8, inflation: 8.3, debt: 81, gdpPerCapita: 7697 },
      { year: 2022, gdpGrowth: 3.0, inflation: 9.3, debt: 85, gdpPerCapita: 8917 },
      { year: 2023, gdpGrowth: 2.9, inflation: 4.6, debt: 85, gdpPerCapita: 10044 }
    ]
  },
  {
    iso3: "ARG",
    name: "Argentina",
    region: "Latin America",
    bloc: ["G20", "Mercosur", "Emerging"],
    latest: { gdpGrowth: -1.6, inflation: 133.5, debt: 89, gdpPerCapita: 13730, unemployment: 6.2, currentAccount: -3.6, renewable: 10.9 },
    history: [
      { year: 2019, gdpGrowth: -2.0, inflation: 53.5, debt: 90, gdpPerCapita: 9963 },
      { year: 2020, gdpGrowth: -9.9, inflation: 42.0, debt: 103, gdpPerCapita: 8500 },
      { year: 2021, gdpGrowth: 10.7, inflation: 48.4, debt: 80, gdpPerCapita: 10636 },
      { year: 2022, gdpGrowth: 5.0, inflation: 72.4, debt: 85, gdpPerCapita: 13650 },
      { year: 2023, gdpGrowth: -1.6, inflation: 133.5, debt: 89, gdpPerCapita: 13730 }
    ]
  }
];

export const indicatorOptions = [
  { key: "gdpGrowth", label: "GDP growth", unit: "% YoY" },
  { key: "inflation", label: "Inflation YoY", unit: "% YoY" },
  { key: "debt", label: "Debt/GDP", unit: "% GDP" },
  { key: "gdpPerCapita", label: "GDP per capita", unit: "USD" },
  { key: "unemployment", label: "Unemployment", unit: "% labor force" },
  { key: "renewable", label: "Renewable share", unit: "% energy" }
] as const;

export type IndicatorKey = (typeof indicatorOptions)[number]["key"];
