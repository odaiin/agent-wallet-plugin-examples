import {
  CommandError,
  type CommandIO,
  InputFieldType,
  type InputSchema,
  PluginCommand,
  schemaToFlags,
} from "@metamask/agent-wallet/plugin";
import {
  AssetFareClientError,
  getQuote,
  parseQuoteIntent,
  type QuoteGuidance,
} from "../../assetfare-client.js";

const inputs = {
  amountUsd: {
    type: InputFieldType.Text,
    flag: "amount-usd",
    message: "Input value in USD (default: 1000; USD 1 is smoke-only)",
    required: false,
    prompt: false,
  },
  fromChain: {
    type: InputFieldType.Text,
    flag: "from-chain",
    message: "Source chain (default: arbitrum)",
    required: false,
    prompt: false,
  },
  fromToken: {
    type: InputFieldType.Text,
    flag: "from-token",
    message: "Source token symbol (default: USDC)",
    required: false,
    prompt: false,
  },
  toChain: {
    type: InputFieldType.Text,
    flag: "to-chain",
    message: "Destination chain (default: base)",
    required: false,
    prompt: false,
  },
  toToken: {
    type: InputFieldType.Text,
    flag: "to-token",
    message: "Destination token symbol (default: USDC)",
    required: false,
    prompt: false,
  },
} satisfies InputSchema;

type QuoteResult = {
  quote: Record<string, unknown>;
  guidance: QuoteGuidance;
};

export default class AssetFareQuote extends PluginCommand<QuoteResult> {
  static override description =
    "Request a fresh read-only AssetFare quote. Defaults to USD 1,000 Arbitrum USDC to Base USDC; USD 1 is smoke-only.";

  static override examples = [
    "<%= config.bin %> assetfare quote",
    "<%= config.bin %> assetfare quote --amount-usd 1000 --from-chain arbitrum --from-token USDC --to-chain base --to-token USDC",
    "<%= config.bin %> assetfare quote --amount-usd 1 --json",
  ];

  static override requiresAuth = false;
  static override requiresInit = false;
  static override flags = schemaToFlags(inputs);

  protected readonly pluginCommandId = "assetfare:quote";

  async execute(io: CommandIO): Promise<QuoteResult> {
    try {
      const values = await io.resolveInputs(inputs);
      const intent = parseQuoteIntent(values);
      return await getQuote(globalThis.fetch.bind(globalThis), intent);
    } catch (error) {
      throw asCommandError(error);
    }
  }

  override successHint(data: QuoteResult): string {
    const smoke = data.guidance.one_dollar_smoke_only ? "USD 1 is smoke-only. " : "";
    return `${smoke}Compare fresh MetaMask --all-quotes candidates at the intended amount: ${data.guidance.metamask_all_quotes_command}`;
  }
}

function asCommandError(error: unknown): CommandError {
  if (error instanceof AssetFareClientError) {
    return new CommandError(
      error.code,
      error.message,
      "No action was prepared, signed, submitted, or executed. Correct the request or retry later.",
    );
  }
  return new CommandError("ASSETFARE_REQUEST_FAILED", "AssetFare quote request failed.", "Retry later.");
}
