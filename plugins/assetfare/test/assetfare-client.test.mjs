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
    direct_route_summary: {
      version: "assetfare-direct-route-summary-v1",
      required_on_every_quote: true,
      route_count: 76,
      step_count: 168,
      ordered_provider_path: true,
      normalized_chain_asset_endpoints: true,
      assetfare_fee_step_bound: true,
      base_unit_amounts_are_decimal_strings: true,
      route_aggregator_used_scope: "assetfare_engine_only",
      classification_values: ["direct_protocol_only", "external_intent"],
      server_signing: false,
      server_submission: false,
    },
    ...overrides,
  };
}

function quote(intent = DEFAULT_QUOTE_INTENT, overrides = {}) {
  const inputBase = Math.round(intent.amount_usd * 1_000_000);
  const expectedOutput = inputBase - 1000;
  const minimumOutput = inputBase - 2000;
  return {
    quote_id: "00000000-0000-4000-8000-000000000001",
    status: "capped_public_agent_release",
    as_of: "2026-09-24T00:00:00Z",
    ttl_seconds: 60,
    intent: {
      from: `${intent.from_chain}:${intent.from_token}`,
      to: `${intent.to_chain}:${intent.to_token}`,
      amount_usd: intent.amount_usd,
      estimated_input_base: inputBase,
    },
    offer: {
      expected_receive_amount: intent.amount_usd - 0.1,
      estimated_min_receive_amount: intent.amount_usd - 0.2,
      output_symbol: intent.to_token,
      assetfare_fee_bps: 1,
      fee_modeled_bps: 1,
      fee_collectible_now: true,
      fee_collection_steps: [0],
    },
    route: {
      status: "pass",
      version: "assetfare-direct-multichain-quote-v2",
      route: "arbitrum:USDC->base:USDC",
      mode: "cctp_direct_composition",
      input_base: inputBase,
      expected_output_base: expectedOutput,
      minimum_output_base: minimumOutput,
      steps: [{
        kind: "direct_bridge",
        provider: "circle_cctp",
        from: "arbitrum",
        to: "base",
        asset: "USDC",
        route_fee_bps: 1,
        index: 0,
        expected_input_base: inputBase,
        floor_input_base: inputBase,
        expected_output_base: expectedOutput,
        minimum_output_base: minimumOutput,
        expected_evidence: { status: "pass", inputAmount: String(inputBase), aggregatorApiUsed: false, signed: false, submitted: false },
        floor_evidence: null,
      }],
      quote_latency_ms: 1,
      aggregator_api_used: false,
      external_intent_protocol_used: false,
      server_signing: false,
      server_submission: false,
    },
    direct_route_summary: {
      version: "assetfare-direct-route-summary-v1",
      route: "arbitrum:USDC->base:USDC",
      from: "arbitrum:USDC",
      to: "base:USDC",
      classification: "direct_protocol_only",
      mode: "cctp_direct_composition",
      route_aggregator_used: false,
      external_intent_protocol_used: false,
      provider_internal_dex_aggregation_possible: false,
      assetfare_fee_bps: 1,
      fee_collection_step_index: 0,
      server_signing: false,
      server_submission: false,
      step_count: 1,
      steps: [{
        index: 0,
        action: "bridge",
        provider: "circle_cctp",
        from: "arbitrum:USDC",
        to: "base:USDC",
        expected_input_base: String(inputBase),
        minimum_input_base: String(inputBase),
        expected_output_base: String(expectedOutput),
        minimum_output_base: String(minimumOutput),
        assetfare_fee_bps: 1,
        direct_protocol: true,
        external_intent_protocol: false,
        aggregator_api_used: false,
      }],
    },
    risk: { external_intent_protocol_used: false, provider_internal_dex_aggregation_possible: false, server_signing: false, server_submission: false },
    execution: { supported: true, first_unsigned_action_supported: true },
    caller_action_plan_handoff: { url: "https://api.assetfare.dev/v2/prepare" },
    caller_action_plan_handoff_v2: { url: "https://api.assetfare.dev/v2/session" },
    handoff_schema_version: 2,
    ...overrides,
  };
}

function acrossQuote() {
  const intent = { from_chain: "base", from_token: "USDC", to_chain: "robinhood", to_token: "USDG", amount_usd: 1000 };
  const value = quote(intent);
  value.offer.output_symbol = "USDG";
  value.route = {
    status: "pass", version: "assetfare-direct-multichain-quote-v2", route: "base:USDC->robinhood:USDG",
    mode: "robinhood_across_ingress_composition", input_base: 1_000_000_000, expected_output_base: 999_999_000,
    minimum_output_base: 999_998_000,
    steps: [{ kind: "direct_bridge", provider: "across_intent_bridge", from: "base", to: "robinhood", from_asset: "USDC", to_asset: "USDG", external_intent_protocol: true, route_fee_bps: 1, index: 0, expected_input_base: 1_000_000_000, floor_input_base: 1_000_000_000, expected_output_base: 999_999_000, minimum_output_base: 999_998_000, expected_evidence: { status: "pass", aggregatorApiUsed: false, signed: false, submitted: false }, floor_evidence: null }],
    quote_latency_ms: 1, aggregator_api_used: false, external_intent_protocol_used: true, server_signing: false, server_submission: false,
  };
  value.risk.external_intent_protocol_used = true;
  value.risk.provider_internal_dex_aggregation_possible = true;
  value.direct_route_summary = {
    version: "assetfare-direct-route-summary-v1", route: "base:USDC->robinhood:USDG", from: "base:USDC", to: "robinhood:USDG",
    classification: "external_intent", mode: "robinhood_across_ingress_composition", route_aggregator_used: false,
    external_intent_protocol_used: true, provider_internal_dex_aggregation_possible: true, assetfare_fee_bps: 1,
    fee_collection_step_index: 0, server_signing: false, server_submission: false, step_count: 1,
    steps: [{ index: 0, action: "bridge", provider: "across_intent_bridge", from: "base:USDC", to: "robinhood:USDG", expected_input_base: "1000000000", minimum_input_base: "1000000000", expected_output_base: "999999000", minimum_output_base: "999998000", assetfare_fee_bps: 1, direct_protocol: false, external_intent_protocol: true, aggregator_api_used: false }],
  };
  return { intent, value };
}

function solanaSolQuote() {
  const intent = { from_chain: "solana", from_token: "SOL", to_chain: "base", to_token: "USDC", amount_usd: 1000 };
  const value = quote(intent);
  value.intent.estimated_input_base = 1_000_000;
  value.route = {
    status: "pass", version: "assetfare-direct-multichain-quote-v2", route: "solana:SOL->base:USDC", mode: "cctp_direct_composition",
    input_base: 1_000_000, expected_output_base: 899_000, minimum_output_base: 898_000,
    steps: [
      { kind: "direct_swap", chain: "solana", provider: "raydium_clmm", from: "SOL", to: "USDC", route_fee_bps: 0, index: 0, expected_input_base: 1_000_000, floor_input_base: 1_000_000, expected_output_base: 900_000, minimum_output_base: 899_000, expected_evidence: { status: "pass", aggregatorApiUsed: false, signed: false, submitted: false }, floor_evidence: null },
      { kind: "direct_bridge", provider: "circle_cctp", from: "solana", to: "base", asset: "USDC", route_fee_bps: 1, index: 1, expected_input_base: 900_000, floor_input_base: 899_000, expected_output_base: 899_000, minimum_output_base: 898_000, expected_evidence: { status: "pass", aggregatorApiUsed: false, signed: false, submitted: false }, floor_evidence: null },
    ],
    quote_latency_ms: 1, aggregator_api_used: false, external_intent_protocol_used: false, server_signing: false, server_submission: false,
  };
  value.offer.fee_collection_steps = [1];
  value.direct_route_summary = {
    version: "assetfare-direct-route-summary-v1", route: "solana:SOL->base:USDC", from: "solana:SOL", to: "base:USDC",
    classification: "direct_protocol_only", mode: "cctp_direct_composition", route_aggregator_used: false,
    external_intent_protocol_used: false, provider_internal_dex_aggregation_possible: false, assetfare_fee_bps: 1,
    fee_collection_step_index: 1, server_signing: false, server_submission: false, step_count: 2,
    steps: [
      { index: 0, action: "swap", provider: "raydium_clmm", from: "solana:SOL", to: "solana:USDC", expected_input_base: "1000000", minimum_input_base: "1000000", expected_output_base: "900000", minimum_output_base: "899000", assetfare_fee_bps: 0, direct_protocol: true, external_intent_protocol: false, aggregator_api_used: false },
      { index: 1, action: "bridge", provider: "circle_cctp", from: "solana:USDC", to: "base:USDC", expected_input_base: "900000", minimum_input_base: "899000", expected_output_base: "899000", minimum_output_base: "898000", assetfare_fee_bps: 1, direct_protocol: true, external_intent_protocol: false, aggregator_api_used: false },
    ],
  };
  return { intent, value };
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
  assert.equal(result.direct_route_summary.required_on_every_quote, true);
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
  assert.equal(result.quote.direct_route_summary.steps[0].provider, "circle_cctp");
  assert.equal(result.quote.direct_route_summary.steps[0].from, "arbitrum:USDC");
  assert.equal(result.quote.direct_route_summary.steps[0].to, "base:USDC");
  assert.equal(result.guidance.direct_route_summary_verified, true);
  assert.equal(result.guidance.assetfare_fee_step_verified, true);
  assert.equal(result.guidance.route_classification, "direct_protocol_only");
  assert.equal(result.guidance.assetfare_engine_route_aggregator_used, false);
  assert.match(
    result.guidance.metamask_all_quotes_command,
    /--amount 1000 .*--from-chain-id 42161 .*--to-chain-id 8453 .*--all-quotes$/,
  );
  assert.equal(result.guidance.action_prepared, false);
  assert.equal(result.guidance.session_created, false);
  assert.equal(result.guidance.transaction_signed, false);
  assert.equal(result.guidance.transaction_submitted, false);
});

test("capabilities fail closed without the REST 2.3.0 direct-route contract", async () => {
  const missing = capabilities();
  delete missing.direct_route_summary;
  await assert.rejects(getCapabilities(async () => jsonResponse(missing)), /expected schema/);

  const wrongScope = capabilities();
  wrongScope.direct_route_summary.route_aggregator_used_scope = "all_providers";
  await assert.rejects(getCapabilities(async () => jsonResponse(wrongScope)), /required contract/);
});

test("quote rejects exact-contract provider, amount, fee, aggregator, and private-field hostiles", async () => {
  const cases = [
    (value) => { delete value.direct_route_summary; },
    (value) => { value.direct_route_summary.steps[0].provider = "unknown_provider"; value.route.steps[0].provider = "unknown_provider"; },
    (value) => { value.direct_route_summary.steps[0].provider = "paxos_usdg_layerzero_oft"; value.route.steps[0].provider = "paxos_usdg_layerzero_oft"; },
    (value) => { value.direct_route_summary.fee_collection_step_index = 7; },
    (value) => { value.direct_route_summary.route_aggregator_used = true; },
    (value) => { value.direct_route_summary.steps[0].aggregator_api_used = true; },
    (value) => { value.direct_route_summary.private_key = "forbidden"; },
  ];
  for (const mutate of cases) {
    const hostile = structuredClone(quote());
    mutate(hostile);
    await assert.rejects(getQuote(async () => jsonResponse(hostile), DEFAULT_QUOTE_INTENT));
  }

  const { intent, value } = solanaSolQuote();
  value.direct_route_summary.steps[1].expected_input_base = "900001";
  value.route.steps[1].expected_input_base = 900001;
  await assert.rejects(getQuote(async () => jsonResponse(value), intent), /exact direct-route contract/);
});

test("Across ingress remains external_intent and cannot be relabeled false-direct", async () => {
  const valid = acrossQuote();
  const result = await getQuote(async () => jsonResponse(valid.value), valid.intent);
  assert.equal(result.quote.direct_route_summary.classification, "external_intent");
  assert.equal(result.guidance.provider_internal_dex_aggregation_possible, true);

  const hostile = acrossQuote();
  hostile.value.direct_route_summary.classification = "direct_protocol_only";
  hostile.value.direct_route_summary.external_intent_protocol_used = false;
  hostile.value.direct_route_summary.provider_internal_dex_aggregation_possible = false;
  hostile.value.route.external_intent_protocol_used = false;
  hostile.value.risk.external_intent_protocol_used = false;
  hostile.value.risk.provider_internal_dex_aggregation_possible = false;
  await assert.rejects(getQuote(async () => jsonResponse(hostile.value), hostile.intent), /exact direct-route contract/);
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
