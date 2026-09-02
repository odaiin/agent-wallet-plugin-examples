import { type CommandIO, PluginCommand } from "@metamask/agent-wallet/plugin";

export default class SampleMnemonicCommand extends PluginCommand<{ capability: "mnemonic-read"; status: "reserved" }> {
  static override requiresAuth = false;
  static override requiresInit = false;
  static override description = "Sample plugin: mnemonic-read capability (reserved; SRP is host-only)";
  protected readonly pluginCommandId = "vault:mnemonic";

  async execute(_io: CommandIO) {
    return { capability: "mnemonic-read" as const, status: "reserved" as const };
  }
}
