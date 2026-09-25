# AssetFare

Read-only AssetFare route discovery for MetaMask Agent Wallet. The plugin adds
exactly two commands:

```text
mm assetfare capabilities
mm assetfare quote
```

`mm assetfare quote` defaults to a representative USD 1,000 quote from
Arbitrum USDC to Base USDC. Override it with flags:

```bash
mm assetfare quote \
  --amount-usd 1000 \
  --from-chain arbitrum \
  --from-token USDC \
  --to-chain base \
  --to-token USDC
```

USD 1 is only a reachability and response-schema smoke check; it is not an
economic comparison. At the amount you actually intend to use, request a fresh
AssetFare quote and fresh MetaMask candidates with `--all-quotes`, for example:

```bash
mm swap quote \
  --from USDC \
  --to USDC \
  --amount 1000 \
  --from-chain-id 42161 \
  --to-chain-id 8453 \
  --all-quotes
```

Quotes expire and availability changes. Never compare a USD 1 smoke result or
a stale quote with a fresh candidate.

## Verified direct provider path

Every accepted quote includes `direct_route_summary`. The plugin fails closed
unless that object exactly matches the requested chain, asset, and USD amount,
the disclosed 76-route plan, and the underlying raw route evidence. The output
therefore gives agents an ordered provider path with normalized `chain:asset`
endpoints, continuous expected/minimum base-unit amounts, and the exact step
that charges AssetFare's 1bp service fee.

`classification: direct_protocol_only` means every step uses a disclosed
direct protocol and excludes Across. `classification: external_intent` marks
Across Robinhood ingress, where provider-internal liquidity sourcing or
aggregation can still occur. `route_aggregator_used: false` is scoped only to
AssetFare's own routing engine and is not a claim about every provider's
internals. Unknown or wrong providers, reordered paths, false-direct Across
claims, amount or fee mismatches, aggregation misstatements, extra fields, and
private or signed material are rejected instead of displayed.

## Sanitized quote-bound continuation

The plugin also validates the complete REST 2.4.1 `continuation_v3`, including
portable quote/route hashes, fingerprint claim, expiry, exact caller bounds,
route-derived wallet chains/event signer, and allowed mode. It removes the raw
continuation and returns only `continuation_descriptor`: quote ID/fingerprint,
expiry, unranked status, required wallet chains/event signer,
allowed/recommended mode, the full OpenAPI URL, and the `legacy_advisory` marker.
The quote payload hash replaces duplicated raw base-unit numbers with exact
`direct_route_summary` strings, then uses typed-canonical-v1 bytes. The encoding
preserves JSON types and negative zero, represents finite numbers by IEEE-754
binary64, sorts object keys by UTF-8 bytes, and rejects unsafe non-substituted
integral numbers plus lone Unicode surrogates; substituted raw amounts may
exceed JavaScript's `2^53` safe limit.

This remains quote-only. The plugin never creates `approval_v3`, changes the
candidate from unranked to selected, collects wallet addresses, or calls
prepare/session. `caller_approved: true` alone is not proof of human approval.
An operator must compare fresh MetaMask candidates, explicitly select locally,
then use a separate reviewed integration if they want to act. Multi-step routes
are session-only; exactly one continuation path may be chosen.

The result also includes `guidance.caller_owned_continuation`, a structured
two-command handoff pinned to `assetfare-mcp@1.3.0`. Because this plugin removes
the raw quote, the first command obtains and writes one new exact validated
quote to a mode-0600 file. Only after comparison and explicit caller approval,
the second command creates strict quote-bound approval locally and requests one
verified unsigned session action. Commands are returned as an executable plus
argument array and contain public-address placeholders only. The plugin still
requests zero Agent Wallet permissions and never prepares, signs, or submits.

Use the continuation for an aggregate refill or material transfer, not
automatically for each failed x402 micropayment. Native-USDC needs below the
dated USD 50 evaluation start should be aggregated before comparison, and a
wallet with no spendable asset on any supported source chain is not an
AssetFare use case.

## Security boundary

- The plugin requests zero Agent Wallet capabilities and zero data-access
  permissions.
- Both commands set `requiresAuth = false` and `requiresInit = false`.
- It does not read wallet state, access a wallet executor, authenticate to
  AssetFare, create a session, prepare an action, sign, submit, or execute a
  transaction.
- It contacts only the fixed public HTTPS endpoints
  `https://api.assetfare.dev/v2/capabilities` and
  `https://api.assetfare.dev/v2/quote`.
- Capabilities must advertise the REST 2.4.1 direct-route contract, and quote
  responses fail closed unless the exact path contract and AssetFare's
  server-signing/server-submission claims pass. Private or signed material is
  rejected.
- Execution handoff and raw continuation fields are removed from quote output. This plugin is for
  discovery and comparison only.

The command classes implement the SDK-required `execute()` method; that method
only performs the read-only HTTP request described above and is not a wallet or
transaction execution command.

## Develop and verify

From the repository root:

```bash
yarn install
yarn workspace assetfare run test
yarn workspace assetfare run manifest:validate
```

Tests inject a mock fetch implementation and make no live AssetFare requests.

For a local Agent Wallet development install:

```bash
mm config set experimentalPlugins true
mm config set experimentalAllowUnverifiedInstalls true
cd plugins/assetfare
mm plugins install "file:$PWD" --accept-permissions
```

Install from the directory, not a packed tarball, so Agent Wallet can read the
manifest and display the empty permission set.
