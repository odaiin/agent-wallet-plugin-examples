import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPABILITIES_URL,
  DEFAULT_QUOTE_INTENT,
  QUOTE_URL,
  getCapabilities,
  getQuote,
  parseQuoteIntent,
} from "../dist/assetfare-client.js";

const endpoints = [
  ["solana", "SOL"],
  ["solana", "USDC"],
  ["solana", "USDG"],
  ["base", "ETH"],
  ["base", "USDC"],
  ["arbitrum", "ETH"],
  ["arbitrum", "USDC"],
  ["robinhood", "ETH"],
  ["robinhood", "USDG"],
  ["polygon", "USDC"],
  ["optimism", "USDC"],
];

function capabilities(overrides = {}) {
  return {
    status: "capped_public_agent_release",
    public_api_enabled: true,
    asset_endpoints: endpoints.map(([chain, token]) => ({ chain, token })),
    directed_conversion_routes: 76,
    server_signing: false,
    server_submission: false,
    ...overrides,
  };
}

function quote(intent = DEFAULT_QUOTE_INTENT, overrides = {}) {
  return {
    quote_id: "00000000-0000-4000-8000-000000000001",
    status: "capped_public_agent_release",
    as_of: "2026-09-24T00:00:00Z",
    ttl_seconds: 60,
    intent: {
      from: `${intent.from_chain}:${intent.from_token}`,
      to: `${intent.to_chain}:${intent.to_token}`,
      amount_usd: intent.amount_usd,
    },
    offer: {
      expected_receive_amount: intent.amount_usd - 0.1,
      estimated_min_receive_amount: intent.amount_usd - 0.2,
      output_symbol: intent.to_token,
      assetfare_fee_bps: 1,
      fee_modeled_bps: 1,
      fee_collectible_now: true,
    },
    route: {
      steps: [{ provider: "mock" }],
      server_signing: false,
      server_submission: false,
    },
    risk: { server_signing: false, server_submission: false },
    execution: { supported: true, first_unsigned_action_supported: true },
    caller_action_plan_handoff: { url: "https://api.assetfare.dev/v2/prepare" },
    caller_action_plan_handoff_v2: { url: "https://api.assetfare.dev/v2/session" },
    handoff_schema_version: 2,
    ...overrides,
  };
}

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    ...init,
  });
}

test("default intent is USD 1,000 Arbitrum USDC to Base USDC", () => {
  assert.deepEqual(parseQuoteIntent({}), DEFAULT_QUOTE_INTENT);
});

test("USD 1 is accepted only as an explicitly labelled smoke amount", async () => {
  const intent = parseQuoteIntent({ amountUsd: "1" });
  const result = await getQuote(async () => jsonResponse(quote(intent)), intent);
  assert.equal(result.guidance.one_dollar_smoke_only, true);
  assert.equal(result.guidance.compare_fresh_candidates_at_intended_amount, true);
});

test("capabilities uses one fixed GET with no wallet authorization", async () => {
  const calls = [];
  const result = await getCapabilities(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse(capabilities());
  });
  assert.equal(result.server_signing, false);
  assert.equal(result.server_submission, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, CAPABILITIES_URL);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
  assert.equal(new Headers(calls[0].init.headers).has("authorization"), false);
});

test("quote uses one exact POST body, strips workflow handoffs, and gives fresh all-quotes guidance", async () => {
  const calls = [];
  const result = await getQuote(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse(quote());
  }, DEFAULT_QUOTE_INTENT);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, QUOTE_URL);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), DEFAULT_QUOTE_INTENT);
  assert.equal(new Headers(calls[0].init.headers).has("authorization"), false);
  assert.equal("execution" in result.quote, false);
  assert.equal("caller_action_plan_handoff" in result.quote, false);
  assert.equal("caller_action_plan_handoff_v2" in result.quote, false);
  assert.equal("handoff_schema_version" in result.quote, false);
  assert.match(
    result.guidance.metamask_all_quotes_command,
    /--amount 1000 .*--from-chain-id 42161 .*--to-chain-id 8453 .*--all-quotes$/,
  );
  assert.equal(result.guidance.action_prepared, false);
  assert.equal(result.guidance.session_created, false);
  assert.equal(result.guidance.transaction_signed, false);
  assert.equal(result.guidance.transaction_submitted, false);
});

test("quote fails closed on server signing or submission claims at any depth", async () => {
  const unsafeTop = quote();
  unsafeTop.risk.server_signing = true;
  await assert.rejects(
    getQuote(async () => jsonResponse(unsafeTop), DEFAULT_QUOTE_INTENT),
    /non-custodial boundary|safety boundary/,
  );

  const unsafeNested = quote();
  unsafeNested.route.steps[0].server_submission = true;
  await assert.rejects(getQuote(async () => jsonResponse(unsafeNested), DEFAULT_QUOTE_INTENT), /non-custodial boundary/);

  const unsafeHandoff = quote();
  unsafeHandoff.caller_action_plan_handoff.assetfare_server_signing = true;
  await assert.rejects(getQuote(async () => jsonResponse(unsafeHandoff), DEFAULT_QUOTE_INTENT), /non-custodial boundary/);

  const missingClaim = quote();
  delete missingClaim.risk.server_submission;
  await assert.rejects(getQuote(async () => jsonResponse(missingClaim), DEFAULT_QUOTE_INTENT), /safety boundary/);
});

test("quote rejects private or signed response material", async () => {
  for (const field of ["private_key", "seedPhrase", "signed_transaction", "signature"]) {
    const unsafe = quote();
    unsafe.route.steps[0][field] = "forbidden";
    await assert.rejects(
      getQuote(async () => jsonResponse(unsafe), DEFAULT_QUOTE_INTENT),
      /forbidden secret or signed material/,
    );
  }
});

test("quote fails closed when the response is not bound to the requested intent", async () => {
  const mismatched = quote();
  mismatched.intent.amount_usd = 999;
  await assert.rejects(getQuote(async () => jsonResponse(mismatched), DEFAULT_QUOTE_INTENT), /safety boundary/);
});

test("invalid routes and sub-USD amounts fail before fetch", () => {
  assert.throws(() => parseQuoteIntent({ amountUsd: "0.99" }), /at least USD 1/);
  assert.throws(
    () => parseQuoteIntent({ fromChain: "polygon", fromToken: "USDC", toChain: "solana", toToken: "USDC" }),
    /source-only route/,
  );
  assert.throws(() => parseQuoteIntent({ fromChain: "base", fromToken: "USDG" }), /source chain and token pair/);
});

test("network, redirect, content-type, and response-size failures are sanitized", async () => {
  await assert.rejects(
    getCapabilities(async () => {
      throw new Error("secret network detail");
    }),
    /^AssetFareClientError: AssetFare request failed\.$/,
  );
  await assert.rejects(
    getCapabilities(async () => new Response("", { status: 302, headers: { location: "https://evil.example" } })),
    /redirected a fixed API request/,
  );
  await assert.rejects(
    getCapabilities(async () => new Response("secret", { status: 200, headers: { "content-type": "text/plain" } })),
    /non-JSON response/,
  );
  await assert.rejects(
    getCapabilities(
      async () =>
        new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json", "content-length": "1048577" },
        }),
    ),
    /exceeded the size limit/,
  );
});

test("tests never fall back to global live fetch", async () => {
  const originalFetch = globalThis.fetch;
  let liveFetchCalls = 0;
  globalThis.fetch = async () => {
    liveFetchCalls += 1;
    throw new Error("live fetch forbidden in tests");
  };
  try {
    await getCapabilities(async () => jsonResponse(capabilities()));
    await getQuote(async () => jsonResponse(quote()), DEFAULT_QUOTE_INTENT);
    assert.equal(liveFetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
