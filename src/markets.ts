export type MarketGroup = 'Tel Aviv (TASE)' | 'Wall Street';

export interface MarketDef {
  /** Yahoo Finance symbol */
  symbol: string;
  /** Display name */
  name: string;
  group: MarketGroup;
}

/**
 * Indices to track. Yahoo Finance symbols:
 *  - ^TA125.TA / ^TA35.TA : Tel Aviv Stock Exchange flagship indices
 *  - ^GSPC / ^DJI / ^IXIC : S&P 500, Dow Jones, Nasdaq Composite
 */
export const MARKETS: MarketDef[] = [
  { symbol: '^TA125.TA', name: 'TA-125', group: 'Tel Aviv (TASE)' },
  { symbol: 'TA35.TA', name: 'TA-35', group: 'Tel Aviv (TASE)' },
  { symbol: '^GSPC', name: 'S&P 500', group: 'Wall Street' },
  { symbol: '^DJI', name: 'Dow Jones', group: 'Wall Street' },
  { symbol: '^IXIC', name: 'Nasdaq Composite', group: 'Wall Street' },
];
