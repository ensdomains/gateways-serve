import {
  CHAINS,
  GatewayProvider,
  type Chain,
  type ChainPair,
  type Provider,
  type ProviderPair,
} from "@unruggable/gateways";
import { FetchRequest } from "ethers";

export type RPCInfo = {
  readonly chain: Chain;
  readonly rpc: string;
  readonly ankr?: string;
  readonly infura?: string;
  readonly alchemy?: string;
  readonly alchemyPremium?: boolean;
  readonly drpc?: string;
};

type InputRpcOpts = {
  "rpc.drpcKey"?: string;
  "rpc.infuraKey"?: string;
  "rpc.alchemyKey"?: string;
  "rpc.alchemyPremium"?: boolean;
  "rpc.ankrKey"?: string;
  "rpc.chain1"?: string;
  "rpc.chain2"?: string;
  timeout: number;
};
export type RpcOpts = {
  drpcKey: string | undefined;
  infuraKey: string | undefined;
  alchemyKey: string | undefined;
  alchemyPremium: boolean | undefined;
  ankrKey: string | undefined;
  customRpc: string | undefined;
  timeout: number;
};

// TODO: this list is incomplete!
// need to scrape all of the slugs and test rpc functionality and proof depth
export const RPC_INFO = new Map<Chain, RPCInfo>(
  (
    [
      {
        chain: CHAINS.MAINNET,
        rpc: "https://rpc.ankr.com/eth/", // https://cloudflare-eth.com is too rate limited
        ankr: "eth",
        infura: "mainnet",
        alchemy: "eth-mainnet",
        drpc: "ethereum",
      },
      {
        chain: CHAINS.SEPOLIA,
        rpc: "https://rpc.ankr.com/eth_sepolia/",
        ankr: "eth_sepolia",
        infura: "sepolia",
        alchemy: "eth-sepolia",
        drpc: "sepolia",
      },
      {
        chain: CHAINS.HOLESKY,
        rpc: "https://rpc.ankr.com/eth_holesky/", //'https://rpc.holesky.ethpandaops.io',
        ankr: "eth_holesky",
        infura: "holesky",
        alchemy: "eth-holesky",
      },
      {
        // https://docs.optimism.io/chain/networks#op-mainnet
        chain: CHAINS.OP,
        rpc: "https://mainnet.optimism.io",
        ankr: "optimism",
        infura: "optimism-mainnet",
        alchemy: "opt-mainnet",
        drpc: "optimism",
      },
      {
        // https://docs.optimism.io/chain/networks#op-sepolia
        chain: CHAINS.OP_SEPOLIA,
        rpc: "https://sepolia.optimism.io",
        ankr: "optimism_sepolia",
        infura: "optimism-sepolia",
        alchemy: "opt-sepolia",
        drpc: "optimism-sepolia",
      },
      {
        // https://docs.base.org/docs/network-information#base-mainnet
        chain: CHAINS.BASE,
        rpc: "https://mainnet.base.org",
        //ankr: 'base', // 202405XX: eth_getProof depth is 10000
        //infura: 'base-mainnet', // 20250116: eth_getProof depth in insufficient
        alchemy: "base-mainnet",
        drpc: "base",
      },
      {
        // https://docs.base.org/docs/network-information#base-testnet-sepolia
        chain: CHAINS.BASE_SEPOLIA,
        rpc: "https://sepolia.base.org",
        ankr: "base_sepolia",
        infura: "base-sepolia",
        //alchemy: 'base-sepolia', // 20241116: eth_getProof depth is less than 100
        drpc: "base-sepolia",
      },
      {
        // https://docs.arbitrum.io/build-decentralized-apps/reference/node-providers#arbitrum-public-rpc-endpoints
        chain: CHAINS.ARB1,
        rpc: "https://arb1.arbitrum.io/rpc",
        ankr: "arbitrum",
        infura: "arbitrum-mainnet",
        alchemy: "arb-mainnet",
        drpc: "arbitrum",
      },
      {
        chain: CHAINS.ARB_NOVA,
        rpc: "https://nova.arbitrum.io/rpc",
        ankr: "arbitrumnova",
        alchemy: "arbnova-mainnet",
      },
      {
        chain: CHAINS.ARB1_SEPOLIA,
        rpc: "https://sepolia-rollup.arbitrum.io/rpc",
        ankr: "arbitrum_sepolia",
        infura: "arbitrum-sepolia",
        alchemy: "arb-sepolia",
        drpc: "arbitrum-sepolia",
      },
      {
        // https://docs.scroll.io/en/developers/developer-quickstart/#scroll-mainnet
        chain: CHAINS.SCROLL,
        rpc: "https://rpc.scroll.io",
        ankr: "scroll",
        infura: "scroll-mainnet",
        drpc: "scroll",
      },
      {
        chain: CHAINS.SCROLL_SEPOLIA,
        rpc: "https://sepolia-rpc.scroll.io",
        ankr: "scroll_sepolia_testnet",
        infura: "scroll-sepolia",
        drpc: "scroll-sepolia",
      },
      {
        // https://docs.taiko.xyz/network-reference/rpc-configuration#taiko-mainnet
        chain: CHAINS.TAIKO,
        rpc: "https://rpc.mainnet.taiko.xyz",
        ankr: "taiko",
      },
      {
        chain: CHAINS.TAIKO_HEKLA,
        rpc: "https://rpc.hekla.taiko.xyz",
        ankr: "taiko_hekla",
      },
      {
        // https://docs.zksync.io/build/connect-to-zksync#mainnet-network-details
        chain: CHAINS.ZKSYNC,
        rpc: "https://mainnet.era.zksync.io",
        ankr: "zksync_era",
        infura: "zksync-mainnet",
        alchemy: "zksync-mainnet",
      },
      {
        chain: CHAINS.ZKSYNC_SEPOLIA,
        rpc: "https://sepolia.era.zksync.dev",
        ankr: "zksync_era_sepolia",
        infura: "zksync-sepolia",
        alchemy: "zksync-sepolia",
      },
      {
        // https://docs.polygon.technology/pos/reference/rpc-endpoints/#mainnet
        chain: CHAINS.POLYGON_POS,
        rpc: "https://polygon-rpc.com/",
        ankr: "polygon",
        infura: "polygon-mainnet",
        alchemy: "polygon-mainnet",
      },
      {
        chain: CHAINS.POLYGON_AMOY,
        rpc: "https://rpc-amoy.polygon.technology/",
        ankr: "polygon_amoy",
        infura: "polygon-amoy",
        alchemy: "polygon-amoy",
      },
      {
        // https://docs.polygon.technology/zkEVM/get-started/quick-start/#manually-add-network-to-wallet
        chain: CHAINS.ZKEVM,
        rpc: "https://zkevm-rpc.com",
        ankr: "polygon_zkevm",
        alchemy: "polygonzkevm-mainnet",
      },
      {
        chain: CHAINS.ZKEVM_CARDONA,
        rpc: "https://rpc.cardona.zkevm-rpc.com",
        ankr: "polygon_zkevm_cardona",
        alchemy: "polygonzkevm-cardona",
      },
      {
        // https://docs.linea.build/developers/quickstart/info-contracts
        chain: CHAINS.LINEA,
        rpc: "https://rpc.linea.build",
        infura: "linea-mainnet",
        //alchemy: 'linea-mainnet', // 20240901: linea_getProof doesn't work
        drpc: "linea",
      },
      {
        chain: CHAINS.LINEA_SEPOLIA,
        rpc: "https://rpc.sepolia.linea.build",
        infura: "linea-sepolia",
        //alchemy: 'linea-sepolia', // 20241111: no linea_getProof
        drpc: "linea-sepolia",
      },
      {
        // https://docs.frax.com/fraxtal/network/network-information#fraxtal-mainnet
        chain: CHAINS.FRAXTAL,
        rpc: "https://rpc.frax.com",
        //alchemy: 'frax-mainnet', // 20240901: eth_getProof doesn't work
      },
      {
        // https://docs.zora.co/zora-network/network#zora-network-mainnet
        chain: CHAINS.ZORA,
        rpc: "https://rpc.zora.energy",
        alchemy: "zora-mainnet",
      },
      {
        // https://docs.blast.io/building/network-information#blast-mainnet
        chain: CHAINS.BLAST,
        rpc: "https://rpc.blast.io",
        ankr: "blast",
        infura: "blast-mainnet",
        alchemy: "blast-mainnet",
      },
      {
        // https://docs-v2.mantle.xyz/devs/dev-guides/tools/endpoints
        chain: CHAINS.MANTLE,
        rpc: "https://rpc.mantle.xyz", // wss://wss.mantle.xyz
      },
      {
        // https://docs.mode.network/general-info/network-details#mode-mainnet
        chain: CHAINS.MODE,
        rpc: "https://mainnet.mode.network/",
      },
      {
        // https://docs.cyber.co/build-on-cyber/connecting-wallet
        chain: CHAINS.CYBER,
        rpc: "https://cyber.alt.technology/",
      },
      {
        chain: CHAINS.CYBER_SEPOLIA,
        rpc: "https://cyber-testnet.alt.technology/",
      },
      {
        // https://redstone.xyz/docs/network-info
        chain: CHAINS.REDSTONE,
        rpc: "https://rpc.redstonechain.com", // wss://rpc.redstonechain.com
      },
      // {
      //   // https://docs.gnosischain.com/about/networks/mainnet
      //   chain: CHAINS.GNOSIS,
      //   rpc: 'https://rpc.gnosischain.com',
      // },
      {
        // https://docs.shape.network/documentation/technical-details/network-information
        chain: CHAINS.SHAPE,
        rpc: "https://mainnet.shape.network",
        alchemy: "shape-mainnet",
      },
      {
        // https://docs.bnbchain.org/bnb-smart-chain/
        chain: CHAINS.BSC,
        rpc: "https://bsc-dataseed.bnbchain.org",
        //infura: 'bsc-mainnet', // 20241002: eth_getProof doesn't work
        alchemy: "bnb-mainnet",
        alchemyPremium: true,
        ankr: "bsc",
      },
      {
        // https://docs.bnbchain.org/bnb-opbnb/get-started/network-info/
        chain: CHAINS.OP_BNB,
        rpc: "https://opbnb-mainnet-rpc.bnbchain.org",
        infura: "opbnb-mainnet",
      },
      {
        // https://docs.celo.org/network#celo-alfajores
        chain: CHAINS.CELO_ALFAJORES,
        rpc: "https://alfajores-forno.celo-testnet.org",
        //infura: 'celo-alfajores', // 20241002: eth_getProof doesn't work
      },
      {
        // https://docs.worldcoin.org/world-chain/quick-start/info
        chain: CHAINS.WORLD,
        rpc: "https://worldchain-mainnet.g.alchemy.com/public",
        alchemy: "worldchain-mainnet",
      },
      {
        chain: CHAINS.WORLD_SEPOLIA,
        rpc: "https://worldchain-sepolia.g.alchemy.com/public",
        alchemy: "worldchain-sepolia",
      },
      // https://docs.apechain.com/metamask
      // https://apechain.hub.caldera.xyz/
      {
        chain: CHAINS.APE,
        rpc: "https://rpc.apechain.com/http",
        // wss://rpc.apechain.com/ws
        // https://apechain.calderachain.xyz/http
      },
      // https://docs.zero.network/build-on-zero/network-information#zer%CE%B8-network
      {
        chain: CHAINS.ZERO,
        rpc: "https://rpc.zerion.io/v1/zero",
      },
      {
        chain: CHAINS.ZERO_SEPOLIA,
        rpc: "https://rpc.zerion.io/v1/zero-sepolia",
      },
      // https://docs.inkonchain.com/quick-start/get-connected
      {
        chain: CHAINS.INK_SEPOLIA,
        rpc: "https://rpc-qnd-sepolia.inkonchain.com", // wss://rpc-qnd-sepolia.inkonchain.com
      },
      // https://docs.unichain.org/docs/technical-information/network-information#unichain-sepolia-testnet
      {
        chain: CHAINS.UNICHAIN_SEPOLIA,
        rpc: "https://sepolia.unichain.org",
        alchemy: "unichain-sepolia",
      },
      // https://docs.morphl2.io/docs/build-on-morph/developer-resources/contracts
      {
        chain: CHAINS.MORPH,
        rpc: "https://rpc-quicknode-holesky.morphl2.io",
      },
    ] satisfies RPCInfo[]
  ).map((x) => [x.chain, x]),
);

function decideProvider(chain: Chain, rpcOpts: RpcOpts) {
  const info = RPC_INFO.get(chain);
  if (!info) throw new Error(`unknown provider: ${chain}`);
  // 20240830: so far, alchemy has the best support
  let apiKey;

  if (rpcOpts.customRpc) {
    console.log(`Using custom RPC: ${rpcOpts.customRpc}`);
    return {
      info,
      type: "custom",
      url: rpcOpts.customRpc,
    };
  }

  if (
    info.alchemy &&
    (apiKey = rpcOpts.alchemyKey) &&
    (!info.alchemyPremium || !!rpcOpts.alchemyPremium)
  ) {
    console.log(`Using Alchemy: ${info.alchemy}`);
    return {
      info,
      type: "alchemy",
      url: `https://${info.alchemy}.g.alchemy.com/v2/${apiKey}`,
      apiKey,
    };
  }
  if (info.infura && (apiKey = rpcOpts.infuraKey)) {
    console.log(`Using Infura: ${info.infura}`);
    return {
      info,
      type: "infura",
      url: `https://${info.infura}.infura.io/v3/${apiKey}`,
      apiKey,
    };
  }
  if (info.drpc && (apiKey = rpcOpts.drpcKey)) {
    console.log(`Using DRPC: ${info.drpc}`);
    return {
      info,
      type: "drpc",
      url: `https://lb.drpc.org/ogrpc?network=${info.drpc}&dkey=${apiKey}`,
      apiKey,
    };
  }
  if (info.ankr && (apiKey = rpcOpts.ankrKey)) {
    console.log(`Using Ankr: ${info.ankr}`);
    return {
      info,
      type: "ankr",
      url: `https://rpc.ankr.com/${info.ankr}/${apiKey}`,
      apiKey,
    };
  }
  console.log(`Using public RPC: ${info.rpc}`);
  return { info, type: "public", url: info.rpc };
}

export function providerURL(chain: Chain, opts: RpcOpts): string {
  return decideProvider(chain, opts).url;
}

export function createProvider(chain: Chain, opts: RpcOpts): Provider {
  const fr = new FetchRequest(providerURL(chain, opts));
  fr.timeout = opts.timeout;
  return new GatewayProvider(fr, chain);
}

export function parseRpcOpts(rpcOpts: InputRpcOpts, pairIndex: 1 | 2): RpcOpts {
  return {
    drpcKey: rpcOpts["rpc.drpcKey"],
    infuraKey: rpcOpts["rpc.infuraKey"],
    alchemyKey: rpcOpts["rpc.alchemyKey"],
    alchemyPremium: rpcOpts["rpc.alchemyPremium"],
    ankrKey: rpcOpts["rpc.ankrKey"],
    customRpc: rpcOpts[`rpc.chain${pairIndex}`],
	timeout: rpcOpts.timeout
  };
}
export function createProviderPair(
  pair: ChainPair,
  rpcOpts: InputRpcOpts,
): ProviderPair {
  const a = pair.chain1;
  const b = pair.chain2;
  return {
    provider1: createProvider(a, parseRpcOpts(rpcOpts, 1)),
    provider2: createProvider(b, parseRpcOpts(rpcOpts, 2)),
  };
}
