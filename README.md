# Dip Rider — BTC trading bot for make.fun

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/tansanggtneo2-star/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/tansanggtneo2-star/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A trading bot for the make.fun bounty
[Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261117-0603).
It trades Coinbase Wrapped BTC (cbBTC) against USDC, minute by minute, with
$1,000 of paper money. Nothing is traded for real.

## Strategy

Buy the first real pullback, then hold. The dev window is chop at the 1-minute
scale (1m return std ~6 bps) while a round trip costs ~26 bps, so every fast
system lost money on it and the only profitable entries bought early and held.
This bot buys the first close 0.30% below the running peak (or at bar 720 if the
price never pulled back but is above the first close), holds to the end, and
exits only on a 3% trailing stop or a 3% hard stop — disaster insurance, not a
trading signal. It never re-enters.

Dev-window result (kit `grade-local`, verified twice, byte-identical action
logs): **net PnL +$4.12, 1 trade, max drawdown 2.12%**, guardrails met.
See [TUNING.md](TUNING.md) for the baselines and every experiment.

## Layout

- `main.ts` — the bot (Node 22, erasable TypeScript, standard library only).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's `sdk/makefun-bars.ts` shim.
- `LICENSE` — MIT.

## Grade locally

```sh
node <kit>/cli/makefun.mjs grade-local --kit <kit> --bot . --driver process --worktree
```
