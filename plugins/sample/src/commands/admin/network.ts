import { type CommandIO, PluginCommand } from "@metamask/agent-wallet/plugin";

export default class SampleNetworkCommand extends PluginCommand<{ capability: "network-manage"; status: "reserved" }> {
  static override requiresAuth = false;
  static override requiresInit = false;
  static override description = "Sample plugin: network-manage capability (reserved for future network management)";
  protected readonly pluginCommandId = "admin:network";

  async execute(_io: CommandIO) {
    return { capability: "network-manage" as const, status: "reserved" as const };
  }
}
