import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
};

/**
 * Runs `/api/*.ts` handlers inside `vite dev`, so localhost matches Vercel
 * serverless routes (Google Calendar status, booking, PayMongo, etc.).
 */
export function localApiPlugin(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      applyEnvFile(path.join(server.config.root, ".env.local"));
      applyEnvFile(path.join(server.config.root, ".env"));

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? "").split("?")[0];
        if (!pathname.startsWith("/api/")) {
          next();
          return;
        }

        applyEnvFile(path.join(server.config.root, ".env.local"));
        applyEnvFile(path.join(server.config.root, ".env"));

        const file = resolveApiFile(server.config.root, pathname);
        if (!file) {
          next();
          return;
        }

        try {
          const rawBody = await readBody(req);
          const apiReq = Object.assign(req, {
            body: parseJson(rawBody),
            rawBody,
          });
          const apiRes = wrapResponse(res);
          const mod = await server.ssrLoadModule(file);
          const handler = mod.default as (req: IncomingMessage, res: ApiResponse) => unknown;
          await handler(apiReq, apiRes);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "Handler did not send a response" }));
          }
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: false,
                error: err instanceof Error ? err.message : "Local API failed",
              }),
            );
          }
        }
      });
    },
  };
}

const API_ALIASES: Record<string, string> = {
  "/api/paymongo/webhook": "/api/paymongo-webhook",
};

function resolveApiFile(root: string, pathname: string): string | null {
  const rel = (API_ALIASES[pathname] ?? pathname).replace(/^\/+/, "");
  const candidates = [`${rel}.ts`, `${rel}.js`, path.join(rel, "index.ts")];
  for (const candidate of candidates) {
    const abs = path.join(root, candidate);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  }
  return null;
}

function wrapResponse(res: ServerResponse): ApiResponse {
  const apiRes = res as ApiResponse;
  apiRes.status = (code: number) => {
    res.statusCode = code;
    return apiRes;
  };
  apiRes.json = (data: unknown) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };
  return apiRes;
}

function readBody(req: IncomingMessage): Promise<string> {
  if (req.method === "GET" || req.method === "HEAD") return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJson(raw: string): unknown {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function applyEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
}

function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.split(/\n/);
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }
    const eq = raw.indexOf("=");
    if (eq < 1) {
      i += 1;
      continue;
    }
    const key = raw.slice(0, eq).trim();
    let value = raw.slice(eq + 1);
    if (value.trim().startsWith("{")) {
      const buf = [value];
      while (!isBalancedJson(buf.join("\n")) && i + 1 < lines.length) {
        i += 1;
        buf.push(lines[i]);
      }
      value = buf.join("\n");
    }
    out[key] = unquote(value.trim());
    i += 1;
  }
  return out;
}

function isBalancedJson(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function unquote(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
