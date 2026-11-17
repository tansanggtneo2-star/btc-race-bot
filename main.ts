// Dip Rider: a buy-the-dip-and-hold bot for cbBTC (CBBTC/USDC) 1-minute bars, long only.
//
// What the dev window taught: at the 1-minute scale the market is chop (1m return std
// ~6 bps) while a full round trip costs ~26 bps, so every active system lost money on
// it — EMA-cross -$106, RSI-Bollinger -$24, ADX-momentum -$33, EMA(24)/EMA(120)
// cross -$34, trailing-return filters -$6..-$52, Donchian breakouts -$19. The only
// entries that made money bought early and held (momentum +$2.45, buy-and-hold +$1.07),
// because the window's gains sit in multi-hour legs and every exit rule gave the gains
// back plus fees. So this bot makes exactly one decision — when to buy — and then holds:
//
//   - Entry: the first bar whose close falls DIP_BPS below the running peak close
//     (buy the first real pullback), or, if no pullback ever comes, at FALLBACK_BAR
//     when the price is above the first close (so an up-trending window still gets
//     its one trade — the guardrails need at least 1).
//   - Exits, disaster insurance only: a trailing stop (value falls TRAIL_BPS below its
//     peak since entry) and a hard stop (value falls STOP_BPS below its cost). Both are
//     wide enough never to fire on ordinary chop; they exist so a crashing race window
//     does not ride the position to the floor.
//   - One symbol, one position, full size on entry. max_slippage_bps 100 (1%) so a fill
//     past a 1-minute gap is refused, not chased.
//
// Everything is deterministic: integer comparisons on the raw closes, no clock, no
// environment, no randomness. The bot reads only the bars the harness sends.
//
// Tuned on the kit's frozen 24h dev window with grade-local (see TUNING.md).

import { BPS, runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

/** Enter on the first close this far below the running peak close, in bps. */
const DIP_BPS = 30;
/** If no dip has come by this batch, buy anyway when above the first close. */
const FALLBACK_BAR = 720;
/** Trailing stop: exit when the position's value falls this far below its peak since entry. */
const TRAIL_BPS = 300;
/** Hard stop: exit when the position's value falls this far below its cost. */
const STOP_BPS = 300;
/** Max slippage per order, in bps past the close it was decided on. */
const MAX_SLIPPAGE_BPS = 100;

/** Highest close seen so far, in raw price units; null before the first bar. */
let peakClose: bigint | null = null;
/** The first close of the window, in raw price units. */
let firstClose: bigint | null = null;
/** Peak position value since entry, in quote units; null while flat. */
let peakValue: bigint | null = null;
/** Whether the entry has been taken. */
let entered = false;

await runBars({
  onBatch(state, batch) {
    const symbol = state.hello.symbols[0].symbol;
    if (state.warmingUp) return [];
    const close = state.close(symbol);
    if (close === null) return [];
    if (firstClose === null) firstClose = close;
    if (peakClose === null || close > peakClose) peakClose = close;
    const held = state.positions.get(symbol);

    if (held !== undefined) {
      const value = state.value(symbol, held.qty);
      if (peakValue === null || value > peakValue) peakValue = value;
      const trailing =
        peakValue !== null && value * BPS <= peakValue * BigInt(Number(BPS) - TRAIL_BPS);
      const stopped = value * BPS <= held.cost * BigInt(Number(BPS) - STOP_BPS);
      if (trailing || stopped) {
        peakValue = null;
        const order: SellInput = { side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [order];
      }
      return [];
    }

    if (entered) return [];
    const dipped = peakClose !== null && close * BPS <= peakClose * BigInt(Number(BPS) - DIP_BPS);
    const fallback =
      batch.seq >= FALLBACK_BAR && firstClose !== null && close > firstClose;
    if (!dipped && !fallback) return [];
    entered = true;
    const { caps, fees } = state.hello;
    const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
    const stake = state.cash < byWeight ? state.cash : byWeight;
    if (stake < BigInt(fees.min_notional_quote_units)) return [];
    const order: BuyInput = { side: 'buy', symbol, notional_quote_units: stake, max_slippage_bps: MAX_SLIPPAGE_BPS };
    return [order];
  },
});
