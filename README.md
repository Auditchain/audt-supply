# AUDT supply endpoint

Live total and circulating supply of Auditchain (AUDT) across Ethereum, Polygon and Robinhood Chain, published as static JSON by GitHub Pages and refreshed every 30 minutes by GitHub Actions. Built for CoinGecko's "Total Supply API" and "Circulating Supply API" fields, which CoinGecko polls every 30 minutes.

## Endpoints

| Path | Content |
|---|---|
| `/total.json` | `{"result":"<total supply, 18 decimals>"}` |
| `/circulating.json` | `{"result":"<circulating supply, 18 decimals>"}` |
| `/supply.json` | full per-chain breakdown (total supply, bridge escrow, excluded wallets, contract-locked wallets, timestamp, method) |

## Method

- Total supply = Ethereum `totalSupply()` minus AUDT held by the two bridge escrow contracts on Ethereum (`0x9923263fa127b3d1484cfd649df8f1831c2a74e4`, the Polygon PoS predicate, and `0x85001cc4867c5e1c22da4b79bb8852b9e2a06da0`, the Robinhood Chain gateway) plus Polygon `totalSupply()` plus Robinhood Chain `totalSupply()`. Tokens sitting in a bridge escrow also exist on the other chain, so they are counted once.
- Circulating supply = total minus the balances of the wallets listed in `config.json` as excluded (company accounts, protocol contracts) minus the balances of every wallet frozen by the token contracts' `lockedList`.
- All values are read live from public JSON-RPC endpoints with fallbacks; nothing is hard-coded except the wallet lists.

Token contracts: Ethereum `0xb90cb79b72eb10c39cbdf86e50b1c89f6a235f2e`, Polygon `0x91c5a5488c0decde1eacd8a4f10e0942fb925067`, Robinhood Chain `0xbf7eb6679d1c833e6a58ac9a122c993c4e691b31`.

## Files

- `supply-lib.mjs` — the computation (batched `eth_call`s, RPC fallback, decimal formatting).
- `make-config.mjs` — writes `config.json` from the exclusion policy and the lock censuses in `data/`.
- `local-run.mjs` — prints the numbers; `--out site` writes the three JSON files the workflow publishes.
- `.github/workflows/supply.yml` — cron every 30 minutes plus manual trigger; builds `site/` and deploys it to GitHub Pages.
- `data/` — lock censuses (addresses on each token's `lockedList`, with balances at census time).

## Operating notes

- After any `addLock` / `removeLock` on either token, update the census files and run `node make-config.mjs`, then commit.
- To change the exclusion policy (for example to treat Team & Advisors wallets as non-circulating), flip `enabled` in `make-config.mjs`, run it, commit.
- GitHub disables scheduled workflows in repositories with no activity for 60 days; a commit or a manual "Run workflow" re-enables them.
- Run `node local-run.mjs` locally at any time to see exactly what will be published.

## Bridge token list

`audt.tokenlist.json` (served at https://auditchain.github.io/audt-supply/audt.tokenlist.json) is a Uniswap-format token list with the canonical AUDT contracts on Ethereum, Base, Robinhood Chain and Polygon, including the bridge contract pairs (`extensions.bridgeInfo` and the Superchain `baseBridgeAddress` fields). Add its URL as a custom token list in bridge UIs that support them (Superbridge: Settings, Token lists).

| Chain | Chain id | AUDT contract | Bridge contracts |
|---|---|---|---|
| Ethereum | 1 | 0xB90cb79B72EB10c39CbDF86e50B1C89F6a235f2e | Base L1StandardBridge 0x3154Cf16ccdb4C6d922629664174b904d80F2C35; Robinhood L1 ERC20 Gateway 0x85001CC4867C5e1C22dA4B79BB8852B9e2a06da0 |
| Base | 8453 | 0xc23B529dD8B8d0B2dd993f0a74a0cC708B63770d | L2StandardBridge 0x4200000000000000000000000000000000000010 |
| Robinhood Chain | 4663 | 0xbf7EB6679d1c833E6a58AC9A122c993c4E691B31 | L2 ERC20 Gateway 0xfd9b17206278C16DdaacF6AC8f05dBf97EdCb31e |
| Polygon | 137 | 0x91c5A5488c0dEcde1Eacd8a4F10e0942fb925067 | Polygon PoS bridge (not a Uniswap bridgeInfo pair) |
