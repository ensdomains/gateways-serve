import { Command } from "@commander-js/extra-typings";
import {
  BoLDRollup,
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
  CHAINS,
} from "@ensdomains/unruggable-gateways";
import { styleText } from "node:util";
import { createProviderPair, parseRpcOpts } from "./providers";
import { serve } from "./serve";
import { runSlotDataTests } from "./test";
import { flattenErrors } from "./utils";

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
  .option("--calls", "Print RPC calls")
  .option(
    "-f, --frequency <number>",
    "Frequency in seconds to check for commits",
    parseUint,
    0,
  )
  .option("--no-prefetch", "Disable Commit Prefetch")
  .option(
    "--log-step-size <number>",
    "eth_getLogs Chunk Size",
    parseUint,
    10000,
  )
  .option("--no-cache", "Disable Cache")
  .option("--no-fast", "Always use eth_getProof instead of eth_getStorageAt")
  .option(
    "--max-call-cache <number>",
    "Number of calls to cache per commit",
    parseUint,
    10000,
  )
  .option(
    "--commit-depth <number>",
    "Number of older commits to keep",
    parseUint,
    2,
  )
  .option(
    "--timeout <number>",
    "Duration in milliseconds to wait for RPC calls",
    parseUint,
    10000,
  )
  .option(
    "--rpc.drpc-key <string>",
    `DRPC API key

    [env: DRPC_KEY=${process.env.DRPC_KEY || ""}]`,
    process.env.DRPC_KEY,
  )
  .option(
    "--rpc.infura-key <string>",
    `Infura API key

    [env: INFURA_KEY=${process.env.INFURA_KEY || ""}]`,
    process.env.INFURA_KEY,
  )
  .option(
    "--rpc.alchemy-key <string>",
    `Alchemy API key

    [env: ALCHEMY_KEY=${process.env.ALCHEMY_KEY || ""}]`,
    process.env.ALCHEMY_KEY,
  )
  .option(
    "--rpc.alchemy-premium",
    `Use alchemy premium API
    
    [env: ALCHEMY_PREMIUM=${process.env.ALCHEMY_PREMIUM || ""}]`,
    !!process.env.ALCHEMY_PREMIUM,
  )
  .option(
    "--rpc.ankr-key <string>",
    `Ankr API key

    [env: ANKR_KEY=${process.env.ANKR_KEY || ""}]`,
    process.env.ANKR_KEY,
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
      longFlag,
    )} ${args}`;
  },
  styleOptionDescription: (str) => {
    if (str.includes("[env: "))
      str = str.replace(
        /\[env: (.*)=(.*)?\] \(default: "?\2"?\)$/,
        (_, key, value) => `[env: ${key}=${value}]`,
      );
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
  opts: ReturnType<typeof program.optsWithGlobals>,
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
      opts.frequency * 1000,
    );
    if (opts.prefetch) {
      prefetch();
      async function prefetch() {
        try {
          const t0 = Date.now();
          const commit = await gateway.getLatestCommit();
          console.log(
            new Date(),
            `Prefetch: index=${commit.index}`,
            commit.prover,
            Date.now() - t0,
          );
        } catch (err) {
          console.log(new Date(), `Prefetch failed: ${flattenErrors(err)}`);
        }
        setTimeout(prefetch, gateway.latestCache.cacheMs);
      }
    }
  } else {
    gateway.disableCache();
  }
  if (opts.calls) {
    [gateway.rollup.provider1, gateway.rollup.provider2].forEach((p) => {
      p.on("debug", (x) => {
        if (x.action === "sendRpcPayload") {
          console.log(chainName(p._network.chainId), x.action, x.payload);
        } else if (x.action == "receiveRpcResult") {
          console.log(chainName(p._network.chainId), x.action, x.result);
        }
      });
    });
  }
  serve({
    port: opts.port,
    gateway,
    config: {
      name: rollup.constructor.name,
      chain1: chainName(rollup.provider1._network.chainId),
      chain2: chainName(rollup.provider2._network.chainId),
      since: new Date(),
      prefetch: opts.cache && opts.prefetch,
	  timeout: opts.timeout,
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
    config: RollupDeployment<config>,
  ) => rollup,
  baseConfig: RollupDeployment<config>,
) =>
  program.command(name).action(function () {
    const opts = this.optsWithGlobals();
    const providers = createProviderPair(baseConfig, opts);
    const rollup = new RollupClass(providers, baseConfig);
    serveGateway(rollup, opts);
  });

const createBoLDRollup = (
  name: string,
  baseConfig: RollupDeployment<ArbitrumConfig>,
) =>
  program
    .command(name)
    .option(
      "--min-age-blocks <number>",
      "Minimum age of block in blocks (0 for finalized)",
      parseInt,
      1800,
    )
    .action(function () {
      const opts = this.optsWithGlobals();
      const providers = createProviderPair(baseConfig, opts);
      const rollup = new BoLDRollup(providers, baseConfig, opts.minAgeBlocks);
      serveGateway(rollup, opts);
    });

const createOpFaultRollup = (
  name: string,
  baseConfig: RollupDeployment<OPFaultConfig>,
) =>
  program
    .command(name)
    .option(
      "--min-age-sec <number>",
      "Minimum age of block in seconds (0 for finalized)",
      parseInt,
      21600,
    )
    .option("--game-finder <string>", "Game finder contract address")
    .action(function () {
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
  baseConfig: RollupDeployment<EuclidConfig>,
) =>
  program
    .command(name)
    .option(
      "--beacon-url <string>",
      `Beacon chain RPC URL
    (automatic if --rpc.drpcKey is supplied)

    [env: BEACON_URL=${process.env.BEACON_URL || ""}]`,
      process.env.BEACON_URL,
    )
    .action(function () {
      const opts = this.optsWithGlobals();
      let { beaconUrl, ["rpc.drpcKey"]: drpcKey } = opts;
      if (!beaconUrl) {
        let slug;
        if (baseConfig.chain1 === CHAINS.MAINNET) {
          slug = "eth-beacon-chain";
        } else if (baseConfig.chain1 === CHAINS.SEPOLIA) {
          slug = "eth-beacon-chain-sepolia";
        }
        if (!slug || !drpcKey) {
          console.error(
            `required option '--beacon-url <string>' not specified`,
          );
          process.exit(1);
        }
        beaconUrl = `https://lb.drpc.org/rest/${drpcKey}/${slug}`;
        console.log(`Derived Beacon API: ${beaconUrl}`);
      }
      const providers = createProviderPair(baseConfig, opts);
      const rollup = new EuclidRollup(providers, baseConfig, beaconUrl);
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

createScrollRollup("scroll", EuclidRollup.mainnetConfig);
createScrollRollup("scroll-sepolia", EuclidRollup.sepoliaConfig);

program
  .command("test <chain>")
  .option("--gateway-url <string>", "Gateway URL", "http://localhost:8000")
  .action(async function () {
    const chain = this.args[0];
    const { gatewayUrl, ...rpcOpts } = this.optsWithGlobals();
    return runSlotDataTests({
      chainName: chain,
      gatewayUrl,
      rpcOpts: parseRpcOpts(rpcOpts, 1),
    });
  });

program.parse();
