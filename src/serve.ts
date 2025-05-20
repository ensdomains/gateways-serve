import {
  Gateway,
  toUnpaddedHex,
  type Rollup,
  flattenErrors,
} from "@unruggable/gateways";
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
  config = toJSON(config);
  const server = Bun.serve({
    port,
    async fetch(req) {
      switch (req.method) {
        case "OPTIONS": {
          return new Response(null, {
            status: 204,
            headers: {
              ...headers,
              "access-control-allow-headers": "*",
            },
          });
        }
        case "GET": {
          const url = new URL(req.url);
          if (url.pathname === "/") {
            return Response.json(config, { headers });
          } else if (url.pathname === "/head") {
            const commit = await gateway.getLatestCommit();
            const [timestamp, stateRoot] = await Promise.all([
              commit.prover.fetchTimestamp(),
              commit.prover.fetchStateRoot(),
            ]);
            return Response.json(
              toJSON({
                commitIndex: commit.index,
                prover: commit.prover.context,
                timestamp,
                stateRoot,
              }),
              { headers },
            );
          } else {
            return new Response("file not found", { status: 404, headers });
          }
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
              },
            );
            console.log(
              new Date(),
              history.toString(),
              Math.round(performance.now() - t0),
            );
            return Response.json({ data }, { headers });
          } catch (err) {
            console.log(new Date(), flattenErrors(err, String));
            return Response.json(
              { message: flattenErrors(err) },
              { status: 500 },
            );
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
        case "object":
          if (Array.isArray(v)) {
            info[k] = v.map(toJSON);
          } else if (v && v.constructor === Object) {
            info[k] = toJSON(v);
          }
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
