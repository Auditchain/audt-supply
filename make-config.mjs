// Generates config.json for the supply endpoint. Re-run after any addLock/removeLock on the token contracts or after a policy change.
// Usage: node make-config.mjs
// Excluded wallets are listed by address only; no owner information is published.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const ethLocked = JSON.parse(readFileSync(join(here, "data", "eth_locked_census.json"), "utf8")).locked.map((x) => x.address.toLowerCase());
const polyLocked = JSON.parse(readFileSync(join(here, "data", "polygon_locked_census.json"), "utf8")).locked.map((x) => x.address.toLowerCase());

// Wallets excluded from circulating supply (company-controlled accounts and protocol contracts). Addresses only.
const excludedBoth = [
  "0x504ecea1b583ccf5f2d774e734a7dff101cb70e8",
  "0xfcaebb15cc045b7c6e441a439897ebaf187c2e7a",
  "0x6284d3e8d097971c26b628e6a7780754e572c858",
  "0x4582db070f34672d29986ef30d91f69d727a0051",
  "0x7330a5c2d912a75c93f5834dc911a60c7a0ec2f3",
];
const excludedPolygonContracts = [
  "0x639d007431780b4dde23a9d3e33268c4181b694b",
  "0x4834b8523f48c803c71e4c72baa0aabfd79f5c82",
  "0xcf0562a19467693a21083dd718835635e90ed2dd",
];
const entry = (address) => ({ address, enabled: true });

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
      excluded: excludedBoth.map(entry),
      locked: ethLocked,
    },
    polygon: {
      chainId: 137, token: "0x91c5a5488c0decde1eacd8a4f10e0942fb925067",
      rpcs: ["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org", "https://1rpc.io/matic"],
      escrows: [],
      excluded: [...excludedBoth, ...excludedPolygonContracts].map(entry),
      locked: polyLocked,
    },
    robinhood: {
      chainId: 4663, token: "0xbf7eb6679d1c833e6a58ac9a122c993c4e691b31",
      rpcs: ["https://rpc.mainnet.chain.robinhood.com"],
      escrows: [],
      excluded: [entry("0xfcaebb15cc045b7c6e441a439897ebaf187c2e7a")],
      locked: [],
    },
  },
  generatedAt: new Date().toISOString(),
  notes: "excluded = company-controlled accounts and protocol contracts, listed by address only; locked = addresses on the token contracts' lockedList (data/*_locked_census.json). Regenerate after any addLock/removeLock.",
};
writeFileSync(join(here, "config.json"), JSON.stringify(config, null, 1));
console.log("config.json written:", { ethLocked: ethLocked.length, polyLocked: polyLocked.length, excludedEth: config.chains.ethereum.excluded.length, excludedPoly: config.chains.polygon.excluded.length });
