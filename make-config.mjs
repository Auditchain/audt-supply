// Generates config.json for the supply endpoint. Re-run after any addLock/removeLock on the token contracts or after a policy change.
// Usage: node make-config.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const ethLocked = JSON.parse(readFileSync(join(here, "data", "eth_locked_census.json"), "utf8")).locked.map((x) => x.address.toLowerCase());
const polyLocked = JSON.parse(readFileSync(join(here, "data", "polygon_locked_census.json"), "utf8")).locked.map((x) => x.address.toLowerCase());

// Exclusion policy. Set enabled:false to keep a wallet in circulation.
const company = [
  { address: "0x504ecea1b583ccf5f2d774e734a7dff101cb70e8", label: "company operating account", enabled: true },
  { address: "0xfcaebb15cc045b7c6e441a439897ebaf187c2e7a", label: "company market-making wallet", enabled: true },
  { address: "0x6284d3e8d097971c26b628e6a7780754e572c858", label: "company distribution wallet", enabled: true },
  { address: "0x4582db070f34672d29986ef30d91f69d727a0051", label: "team admin key", enabled: true },
  { address: "0x7330a5c2d912a75c93f5834dc911a60c7a0ec2f3", label: "company old operating account", enabled: true },
];
const polygonContracts = [
  { address: "0x639d007431780b4dde23a9d3e33268c4181b694b", label: "PacioliClaimContract_V2 (unclaimed allocations)", enabled: true },
  { address: "0x4834b8523f48c803c71e4c72baa0aabfd79f5c82", label: "Staking contract", enabled: true },
  { address: "0xcf0562a19467693a21083dd718835635e90ed2dd", label: "MemberHelpers (staking deposits)", enabled: true },
];
// Team & Advisors wallets: disabled by default. CoinGecko only accepts them as non-circulating if they are genuinely restricted.
const team = [
  { address: "0x8fd2657345017f29dd7f46e24c7d9cbb10e9857f", label: "Jason Meyers", enabled: false },
  { address: "0x99e9a897d142baa47223ee4cbe4c7ed6dabda2a6", label: "Jonathan Wheeler", enabled: false },
  { address: "0xaaee1469155929fb360976e7715cd42dca0ff6e9", label: "Charles Hoffman", enabled: false },
  { address: "0x2d6cea04d06a98747074d38ea2680269f1d09f25", label: "Don Leeds", enabled: false },
  { address: "0xf5e6b87561a77633b3735980a62c2d764f0f35a6", label: "Chris Jastrzebski", enabled: false },
  { address: "0x17d3c6dfd4c835eb3a492f658277d893c22d1e36", label: "Vesting 4 beneficiary (unnamed)", enabled: false },
  { address: "0x8e6e113ce64fbfba23b57a2e1b47cd4baa77b1fa", label: "Vesting 4 beneficiary (unnamed)", enabled: false },
];
const teamEth = [{ address: "0xc9b45b3bff459e88c6d9f5c1f4f7ff54cfd144c3", label: "Miguel Calejo", enabled: false }];

const config = {
  token: "Auditchain (AUDT)",
  decimals: 18,
  chains: {
    ethereum: {
      chainId: 1, token: "0xb90cb79b72eb10c39cbdf86e50b1c89f6a235f2e",
      rpcs: ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org", "https://1rpc.io/eth"],
      escrows: [
        { address: "0x9923263fa127b3d1484cfd649df8f1831c2a74e4", label: "Polygon PoS bridge predicate (backs Polygon supply)" },
        { address: "0x85001cc4867c5e1c22da4b79bb8852b9e2a06da0", label: "Robinhood Chain L1 ERC20 Gateway (backs Robinhood supply)" },
      ],
      excluded: [...company, ...teamEth],
      locked: ethLocked,
    },
    polygon: {
      chainId: 137, token: "0x91c5a5488c0decde1eacd8a4f10e0942fb925067",
      rpcs: ["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org", "https://1rpc.io/matic"],
      escrows: [],
      excluded: [...company, ...polygonContracts, ...team],
      locked: polyLocked,
    },
    robinhood: {
      chainId: 4663, token: "0xbf7eb6679d1c833e6a58ac9a122c993c4e691b31",
      rpcs: ["https://rpc.mainnet.chain.robinhood.com"],
      escrows: [],
      excluded: [{ address: "0xfcaebb15cc045b7c6e441a439897ebaf187c2e7a", label: "company market-making wallet", enabled: true }],
      locked: [],
    },
  },
  generatedAt: new Date().toISOString(),
  notes: "locked lists come from the token contracts' lockedList (data/*_locked_census.json). Regenerate after any addLock/removeLock.",
};
writeFileSync(join(here, "config.json"), JSON.stringify(config, null, 1));
console.log("config.json written:", { ethLocked: ethLocked.length, polyLocked: polyLocked.length, excludedEth: config.chains.ethereum.excluded.filter((w) => w.enabled).length, excludedPoly: config.chains.polygon.excluded.filter((w) => w.enabled).length });
