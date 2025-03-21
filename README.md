# gateways-serve

To install dependencies:

```bash
bun install
```

To run a gateway:

```bash
bun gateways-serve <chain>
```

To test a locally running gateway:

```bash
bun gateways-serve test <chain>
```

To test a remotely running gateway:

```bash
bun gateways-serve test <chain> --gateway-url <gateway-url>
```

## Specifying RPCs

API Keys can be specified with environment variables or command flags:

- Alchemy
  - env: `ALCHEMY_KEY`
  - flag: `--rpc.alchemy-key`
- Ankr
  - env: `ANKR_KEY`
  - flag: `--rpc.ankr-key`
- DRPC
  - env: `DRPC_KEY`
  - flag: `--rpc.drpc-key`
- Infura
  - env: `INFURA_KEY`
  - flag: `--rpc.infura-key`
- Custom RPC - Chain 1 (i.e. L1)
  - flag: `--rpc.chain-1`
- Custom RPC - Chain 2 (i.e. L2)
  - flag: `--rpc.chain-2`

## Supported Chains

Currently supported chains are:

- arb1
- arb1-sepolia
- op
- op-sepolia
- base
- base-sepolia
- linea
- linea-sepolia
- scroll
- scroll-sepolia
