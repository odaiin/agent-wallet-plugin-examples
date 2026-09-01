# ens

ENS name resolution for the MetaMask Agent Wallet. Adds one command:

```
mm ens resolve <name-or-address>
```

## Install (this plugin only)

One-time CLI configuration. Please note, plugins are beta and off by default:

```bash
mm config set experimentalPlugins true
mm config set experimentalAllowUnverifiedInstalls true   # allows local (file:) installs
```

Build and install from this directory:

```bash
yarn install          # from the repo root, wires up the workspace
yarn workspace ens run build
mm plugins install "file:$PWD" --accept-permissions     # run from plugins/ens
```

Install from the directory, not a packed tarball — the CLI reads `package.json#mm` from the
directory to persist the `wallet-read` capability approval for local installs.

Verify and remove:

```bash
mm ens resolve vitalik.eth
mm plugins uninstall ens
```

To build and link every plugin in this repo instead, use `yarn setup` at the repo root.

