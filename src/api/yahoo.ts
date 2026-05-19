import { MarketDef } from '../markets';

export interface IndexQuote {
  symbol: string;
  name: string;
  group: string;
  /** Current / latest market price */
  price: number;
  /** Previous trading day's close */
  previousClose: number;
  /** Absolute change since previous close */
  change: number;
  /** Percent change since previous close */
  changePercent: number;
  /** All-time high (highest price ever recorded) */
  allTimeHigh: number;
  /**
   * Percent below the all-time high. 0 means at peak,
   * negative means below (e.g. -12.4 = 12.4% below peak).
   */
  fromPeakPercent: number;
  currency: string;
  /** Epoch ms of the latest quote */
  asOf: number;
}

interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        chartPreviousClose: number;
        currency: string;
        regularMarketTime: number;
      };
      indicators: {
        quote: Array<{
          high?: Array<number | null>;
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: { code: string; description: string } | null;
  };
}

const HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<YahooChartResponse> {
  const path = `/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${range}&interval=${interval}`;

  let lastError: unknown;
  for (const host of HOSTS) {
    try {
      const res = await fetch(host + path, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; IndicatorsApp/1.0; +https://expo.dev)',
          Accept: 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);
      return (await res.json()) as YahooChartResponse;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${symbol}`);
}

function firstResult(json: YahooChartResponse, name: string) {
  const result = json.chart.result?.[0];
  if (!result) {
    const desc = json.chart.error?.description ?? 'no data returned';
    throw new Error(`${name}: ${desc}`);
  }
  return result;
}

function finiteNums(arr: Array<number | null> | undefined): number[] {
  return (arr ?? []).filter(
    (v): v is number => typeof v === 'number' && isFinite(v),
  );
}

export async function fetchIndexQuote(
  market: MarketDef,
): Promise<IndexQuote> {
  // Two complementary requests:
  //  - max / monthly  -> every historical high, for the all-time high
  //  - 5d  / daily    -> last two daily closes, for an accurate day change
  const [histJson, recentJson] = await Promise.all([
    fetchChart(market.symbol, 'max', '1mo'),
    fetchChart(market.symbol, '5d', '1d'),
  ]);

  const hist = firstResult(histJson, market.name);
  const recent = firstResult(recentJson, market.name);

  const { meta } = hist;
  const price = meta.regularMarketPrice;

  // Previous close = the daily close before the latest one. Works whether or
  // not the market is currently open (the trailing entry is today either way).
  const dailyCloses = finiteNums(recent.indicators.quote?.[0]?.close);
  const previousClose =
    dailyCloses.length >= 2
      ? dailyCloses[dailyCloses.length - 2]
      : meta.chartPreviousClose ?? price;

  const highs = finiteNums(hist.indicators.quote?.[0]?.high);
  // All-time high = max monthly high, but never below the live price.
  const allTimeHigh = Math.max(price, ...(highs.length ? highs : [price]));

  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;
  const fromPeakPercent =
    allTimeHigh > 0 ? ((price - allTimeHigh) / allTimeHigh) * 100 : 0;

  return {
    symbol: market.symbol,
    name: market.name,
    group: market.group,
    price,
    previousClose,
    change,
    changePercent,
    allTimeHigh,
    fromPeakPercent,
    currency: meta.currency,
    asOf: (meta.regularMarketTime ?? Date.now() / 1000) * 1000,
  };
}

export interface QuoteResult {
  market: MarketDef;
  quote?: IndexQuote;
  error?: string;
}

export async function fetchAllQuotes(
  markets: MarketDef[],
): Promise<QuoteResult[]> {
  return Promise.all(
    markets.map(async (market) => {
      try {
        return { market, quote: await fetchIndexQuote(market) };
      } catch (err) {
        return {
          market,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }),
  );
}
