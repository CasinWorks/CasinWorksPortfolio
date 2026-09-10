#!/usr/bin/env node
/**
 * One-time OAuth to get a Google Calendar refresh token for CasinWorks.
 *
 * Prerequisites:
 * 1. Google Cloud Console → enable Google Calendar API
 * 2. OAuth consent screen (External; add yourself as a test user if Testing)
 * 3. Credentials → Create OAuth client ID → Web application
 *    Authorized redirect URI: http://localhost:8787/oauth2callback
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-calendar-oauth.mjs
 *
 * Paste the printed GOOGLE_REFRESH_TOKEN into .env.local and Vercel Production.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { URL } from "node:url";

loadEnvLocal();

const CLIENT_ID = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
const CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
const PORT = 8787;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment.");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (reqUrl.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const err = reqUrl.searchParams.get("error");
    if (err) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end(`OAuth error: ${err}`);
      server.close();
      process.exit(1);
    }
    const code = reqUrl.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing code");
      return;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const json = await tokenRes.json();
    if (!tokenRes.ok || !json.refresh_token) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Token exchange failed: ${JSON.stringify(json)}`);
      console.error(json);
      server.close();
      process.exit(1);
    }

    const message = [
      "Google Calendar connected.",
      "",
      "Add this to .env.local and Vercel Production:",
      "",
      `GOOGLE_CLIENT_ID=${CLIENT_ID}`,
      `GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`,
      `GOOGLE_REFRESH_TOKEN=${json.refresh_token}`,
      "# optional: GOOGLE_CALENDAR_ID=primary",
      "",
      "You can close this tab.",
    ].join("\n");

    console.log("\n" + message + "\n");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(message);
    server.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end("Error");
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("Open this URL in your browser (sign in as the CasinWorks Google account):\n");
  console.log(authUrl.toString());
  console.log(`\nWaiting on ${REDIRECT_URI} …`);
});

function loadEnvLocal() {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    if (!key.startsWith("GOOGLE_")) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
