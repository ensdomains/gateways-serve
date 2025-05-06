#!/bin/bash

CHAIN="$1"
DRPC_KEY="$2"
INFURA_KEY="$3"

echo "DRPC_KEY=$DRPC_KEY" >> $GITHUB_ENV

if [[ "$CHAIN" == "scroll-sepolia" || "$CHAIN" == "scroll" ]]; then
  SUFFIX=""
  if [[ "$CHAIN" == *"-"* ]]; then
    SUFFIX="-${CHAIN#*-}"
  fi
  echo "BEACON_URL=https://lb.drpc.org/rest/$DRPC_KEY/eth-beacon-chain$SUFFIX" >> $GITHUB_ENV
fi

if [[ "$CHAIN" == "linea-sepolia" || "$CHAIN" == "linea" ]]; then
  echo "INFURA_KEY=$INFURA_KEY" >> $GITHUB_ENV
fi