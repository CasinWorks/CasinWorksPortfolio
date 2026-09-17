import { createSign } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  headers: IncomingMessage["headers"] & {
    origin?: string;
    host?: string;
  };
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/**
 * POST /api/password-reset
 * Generates a Firebase password-reset link (no Firebase email) and sends a
 * branded Resend message. Always returns a generic success payload so callers
 * cannot enumerate accounts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
    if (req.headers.origin && req.headers.host) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host) {
          return res.status(403).json({ ok: false, error: "Forbidden" });
        }
      } catch {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }
    }

    const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) as {
      email?: unknown;
    } | null;
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@") || email.length > 254) {
      return res.status(400).json({ ok: false, error: "Enter a valid email address." });
    }

    // Always respond generically after validation — do not leak whether the user exists.
    const link = await createPasswordResetLink(email).catch((err) => {
      console.error("[password-reset] link", err instanceof Error ? err.message : String(err));
      return null;
    });

    if (link) {
      const sent = await sendResetEmail({ to: email, resetHref: link }).catch((err) => {
        console.error("[password-reset] send", err instanceof Error ? err.message : String(err));
        return false;
      });
      if (!sent) {
        // Config / Resend failure — still generic to the client.
        console.error("[password-reset] email not sent");
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[password-reset]", err instanceof Error ? err.message : String(err));
    return res.status(200).json({ ok: true });
  }
}

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function siteUrl() {
  return (env("APP_URL") || env("SITE_URL") || "https://www.casinworks.com").replace(/\/$/, "");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadServiceAccount(): ServiceAccount | null {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (!blob) return null;
  try {
    const row = JSON.parse(blob) as Record<string, unknown>;
    const project_id = String(row.project_id ?? "");
    const client_email = String(row.client_email ?? "");
    let private_key = String(row.private_key ?? "").trim();
    if (
      (private_key.startsWith('"') && private_key.endsWith('"')) ||
      (private_key.startsWith("'") && private_key.endsWith("'"))
    ) {
      private_key = private_key.slice(1, -1);
    }
    private_key = private_key.replace(/\\n/g, "\n");
    if (!project_id || !client_email || !private_key.includes("BEGIN")) return null;
    return { project_id, client_email, private_key };
  } catch {
    return null;
  }
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${unsigned}.${signature}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token?: string };
  if (!res.ok || !json.access_token) throw new Error("token_failed");
  return json.access_token;
}

/** Ask Firebase for the OOB link without sending Firebase's own email. */
async function createPasswordResetLink(email: string): Promise<string | null> {
  const sa = loadServiceAccount();
  if (!sa) throw new Error("missing_service_account");
  const token = await getAccessToken(sa);
  const continueUrl = `${siteUrl()}/portal/sign-in`;
  const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestType: "PASSWORD_RESET",
      email,
      returnOobLink: true,
      continueUrl,
    }),
  });
  const json = (await res.json()) as { oobLink?: string; error?: { message?: string } };
  if (!res.ok || !json.oobLink) {
    // EMAIL_NOT_FOUND / USER_NOT_FOUND → treat as no-op for the client.
    const msg = String(json.error?.message ?? "");
    if (/EMAIL_NOT_FOUND|USER_NOT_FOUND/i.test(msg)) return null;
    throw new Error(msg || `oob_${res.status}`);
  }
  return json.oobLink;
}

async function sendResetEmail(input: { to: string; resetHref: string }): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM") || "CasinWorks <bookings@casinworks.com>";
  if (!apiKey) return false;

  const html = `
    <div style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.55;max-width:520px">
      <p style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b">CasinWorks</p>
      <h1 style="font-size:28px;font-weight:600;margin:8px 0 14px">Reset your password.</h1>
      <p>We received a request to reset the password for <strong>${escapeHtml(input.to)}</strong>.</p>
      <p>Use the button below. The link expires after a short time for your security.</p>
      <p>
        <a href="${escapeHtml(input.resetHref)}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Choose a new password</a>
      </p>
      <p style="font-size:14px;color:#475569">If you did not ask for this, you can ignore this email. Your password will stay the same.</p>
      <p style="font-size:13px;color:#64748b;margin-top:24px;word-break:break-all">Or paste this link into your browser:<br/>${escapeHtml(input.resetHref)}</p>
      <p style="color:#64748b;font-size:13px;margin-top:28px">— Christian Joshua Casin<br/>CasinWorks</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Reset your CasinWorks password",
      html,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[password-reset] resend", res.status, errText.slice(0, 300));
    return false;
  }
  return true;
}
