# Tuning notes — Dip Rider, btc-race-24h-20261117-0603

All numbers are `grade-local --driver process --worktree` on the kit's frozen 24h
dev window (1,440 bars, BTC $64,461 -> $64,776, +0.49%, max buy-and-hold
drawdown 2.12%). A full-size round trip costs ~26 bps in fees, slippage and impact.

## Kit baselines

| baseline       | net PnL | trades | max DD | notes |
| -------------- | ------: | -----: | -----: | ----- |
| buy-and-hold   | +$1.07  | 1      | 2.12%  | buys bar 0, holds |
| hold-cash      | $0.00   | 0      | 0%     | fails the dev gate (0, no trade) |
| momentum       | +$2.45  | 1      | 2.12%  | buys bar 24, holds |
| ema-cross      | -$106.21| 68     | 10.96% | whipsawed |
| rsi-bollinger  | -$24.25 | 11     | 2.79%  | mean reversion lost |
| adx-momentum   | -$32.66 | 26     | 3.60%  | whipsawed |

## My experiments (all lost except the last family)

- EMA(24)/EMA(120) cross + trail 0.8% / stop 1.0%: -$33.93, 18 trades.
- Trailing-return filter, 54 combos (lookback 60/120/240, entry 30/50/100 bps,
  trail 100/150/250 bps, stop 100/150 bps): all negative, best -$5.85
  (lookback 120, entry 100, trail 100, 4 trades).
- Donchian breakout (lookback 240, trail 150, stop 200): -$19.35, 4 trades,
  win rate 0 — breakouts reversed.
- Dip Rider, 6 combos (dip 20/30/50 bps x trail 200/250 bps, stop 300):

| dip | trail | net PnL | trades | max DD |
| --: | ----: | ------: | -----: | -----: |
| 20  | 200   | -$6.87  | 2      | 2.15%  |
| 20  | 250   | +$2.73  | 1      | 2.12%  |
| 30  | 200   | -$5.49  | 2      | 2.15%  |
| 30  | 250   | +$4.12  | 1      | 2.12%  |
| 50  | 200   | -$7.31  | 2      | 2.15%  |
| 50  | 250   | +$2.28  | 1      | 2.12%  |

Lesson: a 2.0% trailing stop fires on this window's normal 2.12% peak-to-trough
swing and destroys value (2 trades, negative). A 2.5%+ trail never fires here,
so dip 20/30/50 are all positive — the family is robust, not one lucky parameter.
Final choice: dip 30 bps, trail 300 bps, stop 300 bps (extra headroom over the
window's 2.12% swing so ordinary chop cannot trigger a stop on the race window,
while a real crash still exits at -3%).

## Final verification (two independent grade-local runs)

- net PnL **+$4.117317** (return +0.4117%), 1 trade, win rate 1.0
- max drawdown 2.1189434%, exposure 99.17%, fees $0.801808
- net PnL at 2x fees +$3.314542 (still positive if fees doubled)
- guardrails met; action_log_sha256 identical across both runs
  (`0a44959180c47662f0d138dc3754aee051279ae039da6f8b17ea188f1229b1d7`),
  L1 regrade reproduced byte for byte (deterministic).

## What the bot does on the race window

Buys the first 0.30% pullback from the running peak (or at bar 720 if the price
never pulled back but is above the first close), holds to the end, exits only on
a 3% trailing stop or a 3% hard stop. It deliberately never re-enters: every
extra trade on the dev window destroyed value, and the stops are disaster
insurance, not trading signals.
