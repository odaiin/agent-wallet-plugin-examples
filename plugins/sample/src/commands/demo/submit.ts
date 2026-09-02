import { type CommandIO, PluginCommand } from "@metamask/agent-wallet/plugin";

export default class SampleSubmitCommand extends PluginCommand<{ walletSubmit: "granted" }> {
  static override requiresAuth = true;
  static override description = "Sample plugin: obtain the wallet executor (capability: wallet-submit)";
  protected readonly pluginCommandId = "demo:submit";

  async execute(io: CommandIO) {
    await this.ctx.walletExecutor(io, this.pluginCommandId);
    return { walletSubmit: "granted" as const };
  }
}
