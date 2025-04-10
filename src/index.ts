import { Command } from "@commander-js/extra-typings";
import {
  BoLDRollup,
  ScrollRollup,
  EuclidRollup,
  Gateway,
  LineaRollup,
  OPFaultRollup,
  type ArbitrumConfig,
  type EuclidConfig,
  type OPFaultConfig,
  type ProviderPair,
  type Rollup,
  type RollupDeployment,
} from "@ensdomains/unruggable-gateways";
import { styleText } from "node:util";
import { createProviderPair, parseRpcOpts } from "./providers";
import { serve } from "./serve";
import { runSlotDataTests } from "./test";

const program = new Command()
  .name("gateways-serve")
  .description("A CLI tool to serve gateways")
  .version("1.0.0")
  .option("-p, --port <number>", "Port to listen on", parseInt, 8000)
  .option("-t, --block-tag <string>", "Block tag to use", "finalized")
  .option(
    "--rpc.drpc-key <string>",
    `DRPC API key

    [env: DRPC_KEY=${process.env.DRPC_KEY || ""}]`,
    process.env.DRPC_KEY
  )
  .option(
    "--rpc.infura-key <string>",
    `Infura API key

    [env: INFURA_KEY=${process.env.INFURA_KEY || ""}]`,
    process.env.INFURA_KEY
  )
  .option(
    "--rpc.alchemy-key <string>",
    `Alchemy API key

    [env: ALCHEMY_KEY=${process.env.ALCHEMY_KEY || ""}]`,
    process.env.ALCHEMY_KEY
  )
  .option(
    "--rpc.alchemy-premium",
    `Use alchemy premium API
    
    [env: ALCHEMY_PREMIUM=${process.env.ALCHEMY_PREMIUM || ""}]`,
    !!process.env.ALCHEMY_PREMIUM
  )
  .option(
    "--rpc.ankr-key <string>",
    `Ankr API key

    [env: ANKR_KEY=${process.env.ANKR_KEY || ""}]`,
    process.env.ANKR_KEY
  )
  .option("--rpc.chain-1 <string>", "RPC URL override for chain 1")
  .option("--rpc.chain-2 <string>", "RPC URL override for chain 2");

program.configureHelp({
  styleOptionTerm: (term) => {
    const [shortFlag, longFlag, args] = (() => {
      let [s, rest] = term.split(", ");
      if (!rest) {
        rest = s;
        s = "   ";
      } else s = `${s},`;
      const [l, ...a] = rest.split(" ");
      return [s, l, a.join(" ")];
    })();
    return `  ${styleText("bold", shortFlag)} ${styleText(
      "bold",
      longFlag
    )} ${args}`;
  },
  styleOptionDescription: (str) => {
    const isHelp = str.includes("display help");
    const lines = ["", ...str.split("\n")]
      .map((l) => `          ${l.trim()}`)
      .join("\n");
    return `${lines}${isHelp ? "" : "\n"}`;
  },
  showGlobalOptions: true,
});

const createBasicRollup = <rollup extends Rollup, config>(
  name: string,
  RollupClass: new (
    providers: ProviderPair,
    config: RollupDeployment<config>
  ) => rollup,
  baseConfig: RollupDeployment<config>
) =>
  program.command(name).action(function (this) {
    const { port, blockTag, ...rpcOpts } = this.optsWithGlobals();

    const config = baseConfig;
    const providers = createProviderPair(config, rpcOpts);

    const rollup = new RollupClass(providers, config);
    rollup.latestBlockTag = blockTag;

    const gateway = new Gateway(rollup);

    serve({ port, config, gateway });
  });

const createBoLDRollup = (
  name: string,
  baseConfig: RollupDeployment<ArbitrumConfig>
) =>
  program
    .command(name)
    .option(
      "--min-age-blocks <number>",
      "Minimum age of block in blocks (0 for finalized)",
      parseInt,
      1800
    )
    .action(function (this) {
      const { port, blockTag, minAgeBlocks, ...rpcOpts } =
        this.optsWithGlobals();
      const config = baseConfig;
      const providers = createProviderPair(config, rpcOpts);

      const rollup = new BoLDRollup(providers, config, minAgeBlocks);
      rollup.latestBlockTag = blockTag;

      const gateway = new Gateway(rollup);

      serve({ port, config, gateway });
    });

const createOpFaultRollup = (
  name: string,
  baseConfig: RollupDeployment<OPFaultConfig>
) =>
  program
    .command(name)
    .option(
      "--min-age-sec <number>",
      "Minimum age of block in seconds (0 for finalized)",
      parseInt,
      21600
    )
    .option("--game-finder <string>", "Game finder contract address")
    .action(function (this) {
      const { port, blockTag, minAgeSec, gameFinder, ...rpcOpts } =
        this.optsWithGlobals();
      const config = {
        ...baseConfig,
        GameFinder: gameFinder ?? baseConfig.GameFinder,
      } satisfies RollupDeployment<OPFaultConfig>;

      const providers = createProviderPair(config, rpcOpts);

      const rollup = new OPFaultRollup(providers, config, minAgeSec);
      rollup.latestBlockTag = blockTag;

      const gateway = new Gateway(rollup);

      serve({ port, config, gateway });
    });

const createScrollRollup = (
  name: string,
  baseConfig: RollupDeployment<EuclidConfig>
) =>
  program
    .command(name)
    .requiredOption("--beacon-url <string>", "Beacon chain RPC URL")
    .action(function (this) {
      const { port, blockTag, beaconUrl, ...rpcOpts } =
        this.optsWithGlobals();

      const config = baseConfig;
      const providers = createProviderPair(config, rpcOpts);

      const rollup = new EuclidRollup(providers, config, beaconUrl);
      rollup.latestBlockTag = blockTag;

      const gateway = new Gateway(rollup);

      serve({ port, config, gateway });
    });

createBoLDRollup("arb1", BoLDRollup.arb1MainnetConfig);
createBoLDRollup("arb1-sepolia", BoLDRollup.arb1SepoliaConfig);

createOpFaultRollup("op", OPFaultRollup.mainnetConfig);
createOpFaultRollup("op-sepolia", OPFaultRollup.sepoliaConfig);
createOpFaultRollup("base", OPFaultRollup.baseMainnetConfig);
createOpFaultRollup("base-sepolia", OPFaultRollup.baseSepoliaConfig);

createBasicRollup("linea", LineaRollup, LineaRollup.mainnetConfig);
createBasicRollup("linea-sepolia", LineaRollup, LineaRollup.sepoliaConfig);

createBasicRollup("scroll", ScrollRollup, ScrollRollup.mainnetConfig);
createScrollRollup("scroll-sepolia", EuclidRollup.sepoliaConfig);

program
  .command("test <chain>")
  .option("--gateway-url <string>", "Gateway URL", "http://localhost:8000")
  .action(async function (this) {
    const chain = this.args[0];
    const { gatewayUrl, ...rpcOpts } = this.optsWithGlobals();
    return runSlotDataTests({
      chainName: chain,
      gatewayUrl,
      rpcOpts: parseRpcOpts(rpcOpts, 1),
    });
  });

program.parse();
