import { BPS, runBars } from './vendor/makefun-bars.ts';

// Hold CBBTC from bar 15, exit once close falls 12% below the highest close
// seen while holding. One round trip per run: after the exit the bot stays flat.
// Sizing is cash minus a fee buffer, capped by caps.max_weight_bps of equity.

let bars = 0;
let inPos = false;
let entered = false;
let peakClose = 0n;

const CASH_BUFFER = 1_000_000n; // 1 USDC kept back for fees (quote units, 6 decimals)
const SLIPPAGE_BPS = 200; // 2% per fill, covers pool impact at this size
const TRAILING_STOP_NUM = 88n; // sell when close < peak * 88 / 100
const ENTRY_BAR = 15;

function entryNotional(state: any): bigint {
  let notional = state.cash - CASH_BUFFER;
  if (notional <= 0n) return 0n;

  const cap = (BigInt(state.hello.caps.max_weight_bps) * state.equity) / BPS;
  if (notional > cap) notional = cap;

  const minNotional = BigInt(state.hello.fees.min_notional_quote_units);
  if (notional < minNotional) return 0n;

  return notional;
}

function trailingStopHit(close: bigint, peak: bigint): boolean {
  return close < (peak * TRAILING_STOP_NUM) / 100n;
}

function onBatch(state: any, _batch: any): any[] {
  if (state.warmingUp) return [];

  bars += 1;

  const symbol: string = state.hello.symbols[0].symbol;
  const close = state.close(symbol);
  if (close === null) return [];

  if (!inPos) {
    if (entered) return [];
    if (bars < ENTRY_BAR) return [];

    const notional = entryNotional(state);
    if (notional === 0n) return [];

    entered = true;
    inPos = true;
    peakClose = close;
    return [{ symbol, side: 'buy', notional_quote_units: notional, max_slippage_bps: SLIPPAGE_BPS }];
  }

  if (close > peakClose) peakClose = close;

  if (trailingStopHit(close, peakClose)) {
    const pos = state.positions.get(symbol);
    inPos = false;
    if (pos === undefined || pos.qty <= 0n) return [];
    return [{ symbol, side: 'sell', qty: pos.qty, max_slippage_bps: SLIPPAGE_BPS }];
  }

  return [];
}

await runBars({ onBatch });
