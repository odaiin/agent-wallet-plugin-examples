import { type CommandIO, PluginCommand } from "@metamask/agent-wallet/plugin";

export default class SampleBalanceCommand extends PluginCommand<{ address: string; balanceWei: string; txCount: number }> {
  static override requiresAuth = true;
  static override description = "Sample plugin: show the active address, on-chain balance, and tx count";
  protected readonly pluginCommandId = "demo:balance";

  async execute(_io: CommandIO) {
    const state = this.ctx.walletStateManager.read();
    const address = [...state.byokWallets, ...state.remoteWallets][0]?.address ?? "";
    if (!address) {
      return { address, balanceWei: "0", txCount: 0 };
    }

    const client = this.ctx.publicClient(1);
    const [balanceWei, txCount] = await Promise.all([
      client.getBalance({ address: address as `0x${string}` }),
      client.getTransactionCount({ address: address as `0x${string}` }),
    ]);

    return { address, balanceWei: balanceWei.toString(), txCount };
  }
}
