import {
  Gateway,
  toUnpaddedHex,
  type Rollup,
} from "@ensdomains/unruggable-gateways";
import { Contract } from "ethers/contract";

const headers = { "access-control-allow-origin": "*" }; // TODO: cli-option to disable cors?

export const serve = <rollup extends Rollup>({
  port,
  gateway,
  config,
}: {
  port: number;
  gateway: Gateway<rollup>;
  config: object;
}) => {
  const server = Bun.serve({
    port,
    async fetch(req) {
      switch (req.method) {
        case "OPTIONS": {
          return new Response(null, {
            headers: {
              ...headers,
              "access-control-allow-headers": "*",
            },
          });
        }
        case "GET": {
          const commit = await gateway.getLatestCommit();
          const commits = [commit];
          if (gateway instanceof Gateway) {
            for (const p of await Promise.allSettled(
              Array.from(gateway.commitCacheMap.cachedKeys(), (i) =>
                gateway.commitCacheMap.cachedValue(i)
              )
            )) {
              if (
                p.status === "fulfilled" &&
                p.value &&
                p.value.commit !== commit
              ) {
                commits.push(p.value.commit);
              }
            }
          }
          return Response.json({
            ...toJSON(config),
            prover: toJSON({
              ...commit.prover,
              block: undefined,
              batchIndex: undefined,
              cache: {
                fetches: commit.prover.cache.maxCached,
                proofs: commit.prover.proofLRU.max,
              },
            }),
            commits: commits.map((c) => ({
              ...toJSON(c),
              fetches: c.prover.cache.cachedSize,
              proofs: c.prover.proofLRU.size,
            })),
          });
        }
        case "POST": {
          const t0 = performance.now();
          try {
            const { sender, data: calldata } = await req.json();
            const { data, history } = await gateway.handleRead(
              sender,
              calldata,
              {
                protocol: "raw",
              }
            );
            console.log(
              new Date(),
              history.toString(),
              Math.round(performance.now() - t0)
            );
            return Response.json({ data }, { headers });
          } catch (err) {
            // flatten nested errors
            const errors = [String(err)];
            for (let e = err; e instanceof Error && e.cause; e = e.cause) {
              errors.push(String(e.cause));
            }
            const error = errors.join(" <== ");
            console.log(new Date(), error);
            return Response.json({ error }, { headers, status: 500 });
          }
        }
        default: {
          return new Response("unsupported", { status: 405 });
        }
      }
    },
  });
  console.log(`Rollup: ${gateway.rollup.constructor.name}`);
  console.log(`Listening on ${port}`);
  return server;
};

function toJSON(x: object) {
  const info: Record<string, any> = {};
  for (const [k, v] of Object.entries(x)) {
    if (v instanceof Contract) {
      info[k] = v.target;
    } else {
      switch (typeof v) {
        case "bigint": {
          info[k] = bigintToJSON(v);
          break;
        }
        case "string":
        case "boolean":
        case "number":
          info[k] = v;
          break;
      }
    }
  }
  return info;
}

function bigintToJSON(x: bigint) {
  const i = Number(x);
  return Number.isSafeInteger(i) ? i : toUnpaddedHex(x);
}
