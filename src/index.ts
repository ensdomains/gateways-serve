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
  type RollupCommitType,
  chainName,
} from "@ensdomains/unruggable-gateways";
import { styleText } from "node:util";
import { createProviderPair, parseRpcOpts } from "./providers";
import { serve } from "./serve";
import { runSlotDataTests } from "./test";

function parseUint(s: string): number {
  const i = parseInt(s);
  if (!Number.isSafeInteger(i) || i < 0)
    throw new Error(`expected unsigned integer: ${s}`);
  return i;
}

const program = new Command()
  .name("gateways-serve")
  .description("A CLI tool to serve gateways")
  .version("1.0.0")
  .option("-p, --port <number>", "Port to listen on", parseUint, 8000)
  .option("-t, --block-tag <string>", "Block tag to use", "finalized")
  .option(
    "-f, --frequency <number>",
    "Frequency in seconds to check for commits",
    parseUint,
    0
  )
  .option("--no-prefetch", "Disable Commit Prefetch")
  .option(
    "--log-step-size <number>",
    "eth_getLogs Chunk Size",
    parseUint,
    10000
  )
  .option("--no-cache", "Disable Cache")
  .option("--no-fast", "Always use eth_getProof instead of eth_getStorageAt")
  .option(
    "--max-call-cache <number>",
    "Number of calls to cache per commit",
    parseUint,
    10000
  )
  .option(
    "--commit-depth <number>",
    "Number of older commits to keep",
    parseUint,
    2
  )
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

function serveGateway<R extends Rollup>(
  rollup: R,
  opts: ReturnType<typeof program.optsWithGlobals>
) {
  rollup.latestBlockTag = opts.blockTag;
  rollup.getLogsStepSize = opts.logStepSize;
  rollup.configure = (commit: RollupCommitType<R>) => {
    commit.prover.fast = opts.fast;
    commit.prover.printDebug = false;
  };
  const gateway = new Gateway(rollup);
  if (opts.cache) {
    gateway.callLRU.max = opts.maxCallCache;
    gateway.commitDepth = opts.commitDepth;
    gateway.latestCache.cacheMs = Math.max(
      gateway.latestCache.cacheMs,
      opts.frequency * 1000
    );
  } else {
    gateway.disableCache();
  }
  if (opts.prefetch) {
    prefetch();
    async function prefetch() {
      await gateway.getLatestCommit().catch(() => {});
      setTimeout(prefetch, gateway.latestCache.cacheMs);
    }
  }
  serve({
    port: opts.port,
    gateway,
    config: {
      name: rollup.constructor.name,
      chain1: chainName(rollup.provider1._network.chainId),
      chain2: chainName(rollup.provider2._network.chainId),
      since: new Date(),
      prefetch: opts.prefetch,
      ...gateway,
      ...rollup,
      beaconAPI: undefined, // hide
    },
  });
}

const createBasicRollup = <rollup extends Rollup, config>(
  name: string,
  RollupClass: new (
    providers: ProviderPair,
    config: RollupDeployment<config>
  ) => rollup,
  baseConfig: RollupDeployment<config>
) =>
  program.command(name).action(function (this) {
    const opts = this.optsWithGlobals();
    const providers = createProviderPair(baseConfig, opts);
    const rollup = new RollupClass(providers, baseConfig);
    serveGateway(rollup, opts);
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
      const opts = this.optsWithGlobals();
      const providers = createProviderPair(baseConfig, opts);
      const rollup = new BoLDRollup(
        providers,
        baseConfig,
        opts.minAgeBlocks
      );
      serveGateway(rollup, opts);
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
      const opts = this.optsWithGlobals();
      const config = {
        ...baseConfig,
        GameFinder: opts.gameFinder ?? baseConfig.GameFinder,
      } satisfies RollupDeployment<OPFaultConfig>;
      const providers = createProviderPair(config, opts);
      const rollup = new OPFaultRollup(providers, config, opts.minAgeSec);
      serveGateway(rollup, opts);
    });

const createScrollRollup = (
  name: string,
  baseConfig: RollupDeployment<EuclidConfig>
) =>
  program
    .command(name)
    .requiredOption("--beacon-url <string>", "Beacon chain RPC URL")
    .action(function (this) {
      const opts = this.optsWithGlobals();
      const providers = createProviderPair(baseConfig, opts);
      const rollup = new EuclidRollup(
        providers,
        baseConfig,
        opts.beaconUrl
      );
      serveGateway(rollup, opts);
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
