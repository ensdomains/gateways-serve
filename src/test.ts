import { CHAINS } from "@unruggable/gateways";
import { Contract } from "ethers";
import { createProvider, type RpcOpts } from "./providers";

const opts = { enableCcipRead: true };

type VerifierConfig = {
  verifier: string;
  pointer: string;
  target: string;
  urls: string[];
};

let errors = 0;

const test = async (name: string, fn: () => Promise<boolean>) => {
  process.stdout.write(`${name}`);
  let error: unknown;
  await fn()
    .catch((error_) => {
      error = error_;
      return false;
    })
    .then((r) => {
      if (!r) errors++;
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      if (error) {
        process.stdout.write("\n");
        console.error(error);
      }
      process.stdout.write(
        `\r${r ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${name}\n`
      );
      return r;
    });
};

const slotDataReaderAbi = [
  "error RequestOverflow()",
  "function fetchCallback(bytes response, bytes carry) view",
  "function readHighscore(uint256 key, (address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (uint256)",
  "function readLatest((address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (uint256)",
  "function readLatestHighscore((address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (uint256)",
  "function readLatestHighscorer((address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (string)",
  "function readLatestHighscorerRealName((address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (string)",
  "function readLatestViaPointer((address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (uint256)",
  "function readName((address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (string)",
  "function readRealName(string key, (address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (string)",
  "function readRootStr(string[] keys, (address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (string)",
  "function readSlicedKeccak((address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (string)",
  "function readSlot(uint256 slot, (address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (uint256)",
  "function readZero((address verifier, address target, address pointer, string[] urls) verifierConfig) view returns (uint256)",
  "function stringCallback(bytes[] m, uint8, bytes) pure returns (string)",
  "function uint256Callback(bytes[] m, uint8, bytes) pure returns (uint256)",
];

const verifierConfigs = {
  "arb1-sepolia": {
    verifier: "0x5e2a4f6c4cc16b27424249eedb15326207c9ee44",
    target: "0x09D2233D3d109683ea95Da4546e7E9Fc17a6dfAF",
    pointer: "0x433F956Aa4E72DA4Da098416fD07e061b23fa73F",
  },
  arb1: {
    verifier: "0x547af78b28290D4158c1064FF092ABBcc4cbfD97",
    target: "0xCC344B12fcc8512cc5639CeD6556064a8907c8a1",
    pointer: "0xaB6D328eB7457164Bb4C2AC27b05200B9b688ac3",
  },
  "base-sepolia": {
    verifier: "0x2a5c43a0aa33c6ca184ac0eadf0a117109c9d6ae",
    target: "0x7AE933cf265B9C7E7Fd43F0D6966E34aaa776411",
    pointer: "0x2D70842D1a1d6413Ce44d0D5FD4AcFDc485540EA",
  },
  base: {
    verifier: "0x074c93cd956b0dd2cac0f9f11dda4d3893a88149",
    target: "0x0C49361E151BC79899A9DD31B8B0CCdE4F6fd2f6",
    pointer: "0x972433d30b6b78C05ADf32972F7b8485C112E055",
  },
  "linea-sepolia": {
    verifier: "0x6AD2BbEE28e780717dF146F59c2213E0EB9CA573",
    target: "0xA2e3c1b0a43336A21E2fA56928bc7B7848c156A8",
    pointer: "0xb3664493FB8414d3Dad1275aC0E8a12Ef859694d",
  },
  linea: {
    verifier: "0x37041498CF4eE07476d2EDeAdcf82d524Aa22ce4",
    target: "0x48F5931C5Dbc2cD9218ba085ce87740157326F59",
    pointer: "0xDeF531a66D7eA1d4E038acABF7F5D1Bd2b306891",
  },
  "op-sepolia": {
    verifier: "0x9fc09f6683ea8e8ad0fae3317e39e57582469707",
    target: "0x09D2233D3d109683ea95Da4546e7E9Fc17a6dfAF",
    pointer: "0x433F956Aa4E72DA4Da098416fD07e061b23fa73F",
  },
  op: {
    verifier: "0x7f49a74d264e48e64e76e136b2a4ba1310c3604c",
    target: "0xf9d79d8c09d24e0C47E32778c830C545e78512CF",
    pointer: "0x19E3e95804020282246E7C30C45cC77dE70E9dc2",
  },
  "scroll-sepolia": {
    verifier: "0xd126DD79133D3aaf0248E858323Cd10C04c5E43d",
    target: "0x57C2F437E0a5E155ced91a7A17bfc372C0aF7B05",
    pointer: "0xA2e3c1b0a43336A21E2fA56928bc7B7848c156A8",
  },
  scroll: {
    verifier: "0xc8d16f56ac528d9e0e67ecb6ece1e95cc8987968",
    target: "0x09D2233D3d109683ea95Da4546e7E9Fc17a6dfAF",
    pointer: "0x28507d851729c12F193019c7b05D916D53e9Cf57",
  },
};

export async function runSlotDataTests({
  chainName,
  gatewayUrl,
  rpcOpts,
}: {
  chainName: string;
  gatewayUrl: string;
  rpcOpts: RpcOpts;
}) {
  const [l1Chain, slotDataReaderAddress] = (() => {
    switch (chainName?.split("-")[1]) {
      case undefined:
        return [CHAINS.MAINNET, "0xCB57158B03351E37A6cEc3Db3Bf359e84Df49e18"];
      case "sepolia":
        return [CHAINS.SEPOLIA, "0x7b4214de619226fD757C468B90877c27d4C1d903"];
      default:
        throw new Error(`Unknown L1 chain for: ${chainName}`);
    }
  })();
  const provider = createProvider(l1Chain, rpcOpts);
  const contract = new Contract(
    slotDataReaderAddress,
    slotDataReaderAbi,
    provider
  );

  const verifierConfigObj =
    verifierConfigs[chainName as keyof typeof verifierConfigs];
  if (!verifierConfigObj) throw new Error(`Unknown chain for: ${chainName}`);
  const verifierConfig = [
    verifierConfigObj.verifier,
    verifierConfigObj.target,
    verifierConfigObj.pointer,
    [gatewayUrl],
  ];

  await test("latest = 49", () =>
    contract.readLatest(verifierConfig, opts).then((r) => r === 49n));
  await test("pointer => latest = 49", () =>
    contract.readLatestViaPointer(verifierConfig, opts).then((r) => r === 49n));
  await test('name = "Satoshi"', () =>
    contract.readName(verifierConfig, opts).then((r) => r === "Satoshi"));
  await test("highscores[0] = 1", () =>
    contract.readHighscore(0, verifierConfig, opts).then((r) => r === 1n));
  await test("highscores[latest] = 12345", () =>
    contract
      .readLatestHighscore(verifierConfig, opts)
      .then((r) => r === 12345n));
  await test("highscorers[latest] = name", () =>
    contract
      .readLatestHighscorer(verifierConfig, opts)
      .then((r) => r === "Satoshi"));
  await test('realnames["Money Skeleton"] = "Vitalik Buterin"', () =>
    contract
      .readRealName("Money Skeleton", verifierConfig, opts)
      .then((r) => r === "Vitalik Buterin"));
  await test('realnames[highscorers[latest]] = "Hal Finney"', () =>
    contract
      .readLatestHighscorerRealName(verifierConfig, opts)
      .then((r) => r === "Hal Finney"));
  await test("zero = 0", () =>
    contract.readZero(verifierConfig, opts).then((r) => r === 0n));
  await test('root.str = "raffy"', () =>
    contract.readRootStr([], verifierConfig, opts).then((r) => r === "raffy"));
  await test('root.map["a"].str = "chonk"', () =>
    contract
      .readRootStr(["a"], verifierConfig, opts)
      .then((r) => r === "chonk"));
  await test('root.map["a"].map["b"].str = "eth"', () =>
    contract
      .readRootStr(["a", "b"], verifierConfig, opts)
      .then((r) => r === "eth"));
  await test('highscorers[keccak(...)] = "chonk"', () =>
    contract.readSlicedKeccak(verifierConfig, opts).then((r) => r === "chonk"));

  if (errors > 0) {
    console.error(`\n ${errors} test${errors === 1 ? "" : "s"} failed`);
    process.exit(1);
  }
  console.info("\nAll tests passed!");
  process.exit(0);
}
