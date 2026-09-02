# sample

Reference sample plugin for the MetaMask Agent Wallet CLI. Demonstrates the plugin API: input schemas, capability declarations, restricted context, and reserved capabilities.

## Commands

| Command | Capability | Notes |
| --- | --- | --- |
| `mm ping [name]` | none | No auth. Input schema + positional args. |
| `mm demo balance` | `wallet-read` | Active address, native balance, tx count via `ctx.publicClient(1)`. |
| `mm demo submit` | `wallet-submit` | Obtains `ctx.walletExecutor`. |
| `mm vault mnemonic` | `mnemonic-read` (reserved) | Declares SRP disclosure; SRP stays host-only. |
| `mm admin config` | `config-write` (reserved) | Declares config-write capability. |
| `mm admin network` | `network-manage` (reserved) | Declares network-manage capability. |

Command paths map to files under `src/commands/` — e.g. `src/commands/demo/balance.ts` → `mm demo balance` / id `demo:balance`.

For the full plugin developer guide, see [plugin-system.md](https://github.com/MetaMask/agentic/blob/main/docs/plugin-system.md) in the agentic repo.

## Install (this plugin only)

One-time CLI configuration. Plugins are beta and off by default:

```bash
mm config set experimentalPlugins true
mm config set experimentalAllowUnverifiedInstalls true   # allows local (file:) installs
```

Build and install from this directory:

```bash
yarn install          # from the repo root, wires up the workspace
yarn workspace sample run build
mm plugins install "file:$PWD" --accept-permissions     # run from plugins/sample
```

Install from the directory, not a packed tarball — the CLI reads `package.json#mm` from the
directory to persist capability approvals for local installs.

Verify and remove:

```bash
mm ping Alice
mm demo balance
mm plugins uninstall sample
```

To build and link every plugin in this repo instead, use `yarn setup` at the repo root.
