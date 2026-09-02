import { type CommandIO, InputFieldType, type InputSchema, PluginCommand, schemaToArgs, schemaToFlags } from "@metamask/agent-wallet/plugin";

const inputs = {
  name: {
    type: InputFieldType.Text,
    flag: "name",
    message: "Name to greet",
    required: false,
    prompt: false,
    index: 0,
  },
} satisfies InputSchema;

export default class SamplePingCommand extends PluginCommand<{ message: string }> {
  static override requiresAuth = false;
  static override requiresInit = false;
  static override description = "Sample plugin: greet without auth (demonstrates the input schema)";
  static override flags = schemaToFlags(inputs);
  static override args = schemaToArgs(inputs);
  protected readonly pluginCommandId = "ping";

  async execute(io: CommandIO) {
    const { name } = await io.resolveInputs(inputs);
    return { message: name ? `pong, ${name}` : "pong" };
  }
}
