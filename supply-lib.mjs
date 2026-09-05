// AUDT supply computation shared by the Cloudflare Worker, the GitHub Actions job and the local runner.
// Total supply   = Ethereum totalSupply - AUDT escrowed in bridge contracts on Ethereum + Polygon totalSupply + Robinhood totalSupply
// Circulating    = Total supply - balances of the excluded wallets (config.excluded) - balances of contract-locked wallets (config.locked)
// Everything is read live from public JSON-RPC endpoints; no keys. Numbers are returned as decimal strings with 18 decimals.

const SEL_TOTAL_SUPPLY = "0x18160ddd";
const SEL_BALANCE_OF = "0x70a08231";
const pad = (a) => a.replace(/^0x/, "").toLowerCase().padStart(64, "0");
const toBig = (hex) => (typeof hex === "string" && hex.length >= 3 ? BigInt(hex) : 0n);

async function post(url, body, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs || 20000);
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status + " from " + url);
    return await r.json();
  } finally { clearTimeout(t); }
}

// Batched eth_call with fallback across RPC URLs and a sequential fallback if the node rejects batches.
async function ethCalls(rpcs, calls) {
  let lastErr = null;
  for (const url of rpcs) {
    try {
      const out = new Array(calls.length);
      const CHUNK = 40;
      for (let i = 0; i < calls.length; i += CHUNK) {
        const slice = calls.slice(i, i + CHUNK);
        const batch = slice.map((c, k) => ({ jsonrpc: "2.0", id: i + k + 1, method: "eth_call", params: [{ to: c.to, data: c.data }, "latest"] }));
        let res = await post(url, batch);
        if (!Array.isArray(res)) {
          res = [];
          for (const b of batch) res.push(await post(url, b));
        }
        for (const r of res) {
          if (!r || r.error) throw new Error("rpc error: " + JSON.stringify(r && r.error));
          out[r.id - 1] = r.result;
        }
      }
      if (out.some((v) => v === undefined)) throw new Error("missing results");
      return out;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("all RPCs failed");
}

export async function computeSupply(config) {
  const chains = config.chains;
  const results = {};
  for (const [name, ch] of Object.entries(chains)) {
    const calls = [{ to: ch.token, data: SEL_TOTAL_SUPPLY }];
    const labels = ["totalSupply"];
    for (const e of ch.escrows || []) { calls.push({ to: ch.token, data: SEL_BALANCE_OF + pad(e.address) }); labels.push("escrow:" + e.address); }
    for (const w of ch.excluded || []) { if (w.enabled === false) continue; calls.push({ to: ch.token, data: SEL_BALANCE_OF + pad(w.address) }); labels.push("excluded:" + w.address); }
    for (const a of ch.locked || []) { calls.push({ to: ch.token, data: SEL_BALANCE_OF + pad(a) }); labels.push("locked:" + a); }
    const raw = await ethCalls(ch.rpcs, calls);
    const r = { totalSupply: 0n, escrowed: 0n, excluded: 0n, locked: 0n, detail: [] };
    raw.forEach((hex, i) => {
      const v = toBig(hex); const l = labels[i];
      if (l === "totalSupply") r.totalSupply = v;
      else if (l.startsWith("escrow:")) { r.escrowed += v; r.detail.push({ kind: "escrow", address: l.slice(7), balance: v }); }
      else if (l.startsWith("excluded:")) { r.excluded += v; r.detail.push({ kind: "excluded", address: l.slice(9), balance: v }); }
      else if (l.startsWith("locked:")) { r.locked += v; }
    });
    results[name] = r;
  }
  let total = 0n, nonCirculating = 0n;
  for (const r of Object.values(results)) { total += r.totalSupply - r.escrowed; nonCirculating += r.excluded + r.locked; }
  const circulating = total - nonCirculating;
  return { total, circulating, nonCirculating, chains: results, computedAt: new Date().toISOString() };
}

export function toDecimalString(wei, decimals = 18) {
  const neg = wei < 0n; const v = neg ? -wei : wei;
  const s = v.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, s.length - decimals), frac = s.slice(s.length - decimals);
  return (neg ? "-" : "") + int + "." + frac;
}

export function toPublicJson(sup) {
  const chains = {};
  for (const [name, r] of Object.entries(sup.chains)) {
    chains[name] = { totalSupply: toDecimalString(r.totalSupply), bridgeEscrowed: toDecimalString(r.escrowed), excludedWallets: toDecimalString(r.excluded), contractLockedWallets: toDecimalString(r.locked) };
  }
  return { total_supply: toDecimalString(sup.total), circulating_supply: toDecimalString(sup.circulating), non_circulating: toDecimalString(sup.nonCirculating), chains, computed_at: sup.computedAt,
    method: "total = Ethereum totalSupply - AUDT held by bridge escrow contracts on Ethereum + Polygon totalSupply + Robinhood Chain totalSupply; circulating = total - company/treasury/contract wallets - wallets frozen by the token contract lockedList" };
}
