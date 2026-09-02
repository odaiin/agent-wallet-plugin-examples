import { type CommandIO, PluginCommand } from "@metamask/agent-wallet/plugin";

export default class SampleConfigCommand extends PluginCommand<{ capability: "config-write"; status: "reserved" }> {
  static override requiresAuth = false;
  static override requiresInit = false;
  static override description = "Sample plugin: config-write capability (reserved for future config mutations)";
  protected readonly pluginCommandId = "admin:config";

  async execute(_io: CommandIO) {
    return { capability: "config-write" as const, status: "reserved" as const };
  }
}
