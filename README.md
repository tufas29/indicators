# Market Indicators

A React Native (Expo) app that shows the current level of the major **Tel Aviv (TASE)** and **Wall Street** indices and how far each one is below its **all-time high**.

## Indices tracked

| Group | Index | Yahoo symbol |
|-------|-------|--------------|
| Tel Aviv (TASE) | TA-125 | `^TA125.TA` |
| Tel Aviv (TASE) | TA-35 | `TA35.TA` |
| Wall Street | S&P 500 | `^GSPC` |
| Wall Street | Dow Jones | `^DJI` |
| Wall Street | Nasdaq Composite | `^IXIC` |

## Running

```bash
npm install
npm start
```

### Behind a corporate / TLS-intercepting network

This network re-signs TLS with a private root CA, so Node rejects npm and
Expo connections with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Node 22+ can trust
the OS certificate store (which already contains the corporate root) — prefix
commands with the flag:

```powershell
$env:NODE_OPTIONS = "--use-system-ca"   # PowerShell, current session
npm install
npm start
```

To make it permanent for your user account:

```powershell
setx NODE_OPTIONS "--use-system-ca"
```

Then:

- Press **`a`** for an Android emulator, **`i`** for the iOS simulator, or **`w`** for web.
- Or scan the QR code with the **Expo Go** app on your phone (same Wi‑Fi).

Pull down on the list to refresh quotes.

## How "distance from peak" is computed

For each index the app fetches the full monthly price history from Yahoo
Finance. Two requests per index: `range=max&interval=1mo` for the all-time
high (the maximum of every monthly high, never below the live price), and
`range=5d&interval=1d` for the previous trading day's close (used for the
day change). The card shows `(price - allTimeHigh) / allTimeHigh` as a
percentage, plus a bar that fills proportionally to how close the index is
to its peak.

## Data source

Yahoo Finance's public (unofficial) chart endpoint — no API key required.
It is rate-limited and not contractually guaranteed; swap `src/api/yahoo.ts`
for a paid provider if you need an SLA.

## Project layout

- `App.tsx` — main screen, grouped list, pull-to-refresh
- `src/markets.ts` — the list of indices/symbols
- `src/api/yahoo.ts` — Yahoo Finance client + all-time-high math
- `src/components/IndexCard.tsx` — per-index card UI
- `src/format.ts` — number/percent/time formatting
