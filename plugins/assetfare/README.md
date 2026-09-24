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
- Responses fail closed unless AssetFare's server-signing and
  server-submission claims are explicitly `false`. Private or signed material
  in a response is rejected.
- Execution handoff fields are removed from quote output. This plugin is for
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
