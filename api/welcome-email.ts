import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
  headers: IncomingMessage["headers"] & {
    authorization?: string;
    origin?: string;
    host?: string;
  };
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

/**
 * POST /api/welcome-email
 * After portal registration — branded welcome via Resend.
 * Auth: Firebase ID token; only emails the verified account email.
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

    const user = await lookupIdToken(req.headers.authorization);
    if (!user) return res.status(401).json({ ok: false, error: "Sign in required" });

    const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) as {
      displayName?: unknown;
      role?: unknown;
    } | null;

    const displayName =
      typeof body?.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim()
        : user.displayName || user.email.split("@")[0] || "there";
    const role = body?.role === "subcontractor" ? "subcontractor" : "client";

    const sent = await sendWelcomeEmail({
      to: user.email,
      displayName,
      role,
    });

    return res.status(200).json({ ok: true, sent });
  } catch (err) {
    console.error("[welcome-email]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Could not send welcome email" });
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

async function lookupIdToken(
  authorization: string | undefined,
): Promise<{ email: string; displayName: string } | null> {
  const bearer = authorization ?? "";
  const idToken = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
  if (!idToken) return null;
  const apiKey = env("FIREBASE_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    const json = (await res.json()) as {
      users?: { email?: string; displayName?: string }[];
    };
    const row = json.users?.[0];
    const email = String(row?.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) return null;
    return { email, displayName: String(row?.displayName ?? "").trim() };
  } catch {
    return null;
  }
}

async function sendWelcomeEmail(input: {
  to: string;
  displayName: string;
  role: "client" | "subcontractor";
}): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM") || "CasinWorks <bookings@casinworks.com>";
  const notify = (env("BOOKING_NOTIFY_EMAIL") || "christianjoshuacasin@gmail.com").toLowerCase();
  if (!apiKey) return false;

  const first = input.displayName.split(/\s+/)[0] || "there";
  const isClient = input.role === "client";
  const portalHref = `${siteUrl()}/portal`;
  const bookHref = `${siteUrl()}/book`;
  const html = isClient
    ? `
    <div style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.55;max-width:520px">
      <p style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b">CasinWorks</p>
      <h1 style="font-size:28px;font-weight:600;margin:8px 0 14px">Welcome in.</h1>
      <p>Hi ${escapeHtml(first)},</p>
      <p>Your portal account is ready. This is where engagements live — project progress, documents, comments, and consultation bookings — in one place with CasinWorks.</p>
      <p style="background:#f7f5f0;padding:14px 16px;border:1px solid rgba(0,0,0,0.08)">
        Use the same email you booked with so past consultations and projects attach automatically.
      </p>
      <p>
        <a href="${portalHref}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Open the portal</a>
      </p>
      <p style="font-size:14px;color:#475569">Need an hour first? <a href="${bookHref}">Book a consultation</a>.</p>
      <p style="color:#64748b;font-size:13px;margin-top:28px">— Christian Joshua Casin<br/>CasinWorks</p>
    </div>`
    : `
    <div style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.55;max-width:520px">
      <p style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b">CasinWorks</p>
      <h1 style="font-size:28px;font-weight:600;margin:8px 0 14px">Welcome to the board.</h1>
      <p>Hi ${escapeHtml(first)},</p>
      <p>Your collaborator account is ready. Open the portal to see the gig board and apply when work fits.</p>
      <p>
        <a href="${portalHref}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Open the portal</a>
      </p>
      <p style="color:#64748b;font-size:13px;margin-top:28px">— Christian Joshua Casin<br/>CasinWorks</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        ...(notify && notify !== input.to ? { bcc: [notify] } : {}),
        subject: isClient ? "Welcome to CasinWorks" : "Welcome to the CasinWorks gig board",
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[welcome-email] resend", res.status, errText.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[welcome-email] resend", err instanceof Error ? err.message : String(err));
    return false;
  }
}
