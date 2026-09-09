import { createSign, randomUUID } from "node:crypto";
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

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

/**
 * POST /api/consultation-status
 * Admin confirm/cancel. On confirm: create Google Calendar event + Meet, invite client.
 * Self-contained — no shared api/_lib imports.
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

    const uid = await verifyIdToken(req.headers.authorization);
    if (!uid) return res.status(401).json({ ok: false, error: "Sign in required" });

    const sa = loadServiceAccount();
    if (!sa) return res.status(503).json({ ok: false, error: "Server is not configured" });

    const fsToken = await getFirestoreAccessToken(sa);
    const role = await getUserRole(sa.project_id, fsToken, uid);
    if (role !== "admin") return res.status(403).json({ ok: false, error: "Admin only" });

    const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) as {
      id?: unknown;
      status?: unknown;
    } | null;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const status = body?.status === "confirmed" || body?.status === "cancelled" ? body.status : "";
    if (!id || id.length > 128 || !status) {
      return res.status(400).json({ ok: false, error: "Invalid request" });
    }

    const consult = await getConsultation(sa.project_id, fsToken, id);
    if (!consult) return res.status(404).json({ ok: false, error: "Consultation not found" });

    if (status === "confirmed") {
      return await confirmWithMeet(res, sa, fsToken, id, consult);
    }
    return await cancelWithMeet(res, sa, fsToken, id, consult);
  } catch (err) {
    console.error("[consultation-status]", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ ok: false, error: "Could not update consultation" });
  }
}

async function confirmWithMeet(
  res: VercelResponse,
  sa: ServiceAccount,
  fsToken: string,
  id: string,
  consult: Record<string, unknown>,
) {
  const current = String(consult.status ?? "");
  if (current === "cancelled") {
    return res.status(400).json({ ok: false, error: "Consultation was cancelled" });
  }
  if (current === "confirmed" && consult.meetUrl && consult.googleEventId) {
    return res.status(200).json({
      ok: true,
      status: "confirmed",
      meetUrl: String(consult.meetUrl),
      googleEventId: String(consult.googleEventId),
      already: true,
    });
  }

  const startsAt = String(consult.startsAt ?? "");
  const hours = Number(consult.hours ?? 1);
  const clientEmail = String(consult.clientEmail ?? "").trim().toLowerCase();
  const clientName = String(consult.clientName ?? "Client");
  if (!startsAt || !clientEmail || !Number.isFinite(hours) || hours < 1) {
    return res.status(400).json({ ok: false, error: "Consultation is incomplete" });
  }

  let meetUrl = consult.meetUrl ? String(consult.meetUrl) : "";
  let googleEventId = consult.googleEventId ? String(consult.googleEventId) : "";

  if (!googleEventId) {
    const gcal = googleCalendarCreds();
    if (!gcal) {
      return res.status(503).json({
        ok: false,
        error: "Google Calendar is not connected. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.",
      });
    }
    const access = await refreshGoogleAccessToken(gcal);
    const created = await createCalendarEvent(access, gcal.calendarId, {
      startsAt,
      hours,
      clientEmail,
      clientName,
      notes: consult.notes ? String(consult.notes) : undefined,
      company: consult.company ? String(consult.company) : undefined,
    });
    meetUrl = created.meetUrl;
    googleEventId = created.eventId;

    try {
      const syncedAt = new Date().toISOString();
      await patchDocument(sa.project_id, fsToken, "consultations", id, {
        status: "confirmed",
        meetUrl,
        googleEventId,
        googleCalendarSyncedAt: syncedAt,
      });
    } catch (err) {
      await deleteCalendarEvent(access, gcal.calendarId, googleEventId).catch(() => undefined);
      throw err;
    }

    return res.status(200).json({ ok: true, status: "confirmed", meetUrl, googleEventId });
  }

  await patchDocument(sa.project_id, fsToken, "consultations", id, { status: "confirmed" });
  return res.status(200).json({
    ok: true,
    status: "confirmed",
    meetUrl: meetUrl || undefined,
    googleEventId,
  });
}

async function cancelWithMeet(
  res: VercelResponse,
  sa: ServiceAccount,
  fsToken: string,
  id: string,
  consult: Record<string, unknown>,
) {
  const googleEventId = consult.googleEventId ? String(consult.googleEventId) : "";
  if (googleEventId) {
    const gcal = googleCalendarCreds();
    if (gcal) {
      try {
        const access = await refreshGoogleAccessToken(gcal);
        await deleteCalendarEvent(access, gcal.calendarId, googleEventId);
      } catch (err) {
        console.error("[consultation-status] calendar delete", err instanceof Error ? err.message : String(err));
      }
    }
  }

  await patchDocument(sa.project_id, fsToken, "consultations", id, {
    status: "cancelled",
  });

  return res.status(200).json({ ok: true, status: "cancelled" });
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

function loadServiceAccount(): ServiceAccount | null {
  const blob = env("FIREBASE_SERVICE_ACCOUNT");
  if (!blob) return null;
  try {
    let raw: unknown = JSON.parse(blob);
    if (typeof raw === "string") raw = JSON.parse(raw);
    const row = raw as Record<string, unknown>;
    const project_id = String(row.project_id ?? "");
    const client_email = String(row.client_email ?? "");
    const private_key = String(row.private_key ?? "").trim().replace(/\\n/g, "\n");
    if (!project_id || !client_email || !private_key.includes("BEGIN")) return null;
    return { project_id, client_email, private_key };
  } catch {
    return null;
  }
}

function googleCalendarCreds(): { clientId: string; clientSecret: string; refreshToken: string; calendarId: string } | null {
  const clientId = env("GOOGLE_CLIENT_ID");
  const clientSecret = env("GOOGLE_CLIENT_SECRET");
  const refreshToken = env("GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) return null;
  return {
    clientId,
    clientSecret,
    refreshToken,
    calendarId: env("GOOGLE_CALENDAR_ID") || "primary",
  };
}

async function verifyIdToken(authorization: string | undefined): Promise<string | null> {
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
    const json = (await res.json()) as { users?: { localId?: string }[] };
    return json.users?.[0]?.localId || null;
  } catch {
    return null;
  }
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getFirestoreAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
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
  if (!res.ok || !json.access_token) throw new Error("firestore_token_failed");
  return json.access_token;
}

async function refreshGoogleAccessToken(creds: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || "google_token_failed");
  }
  return json.access_token;
}

function decodeFields(fields: Record<string, Record<string, unknown>> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("integerValue" in v) out[k] = Number(v.integerValue);
    else if ("doubleValue" in v) out[k] = Number(v.doubleValue);
    else if ("booleanValue" in v) out[k] = Boolean(v.booleanValue);
  }
  return out;
}

async function getUserRole(projectId: string, token: string, uid: string): Promise<string | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore_user_${res.status}`);
  const json = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
  const data = decodeFields(json.fields);
  return data.role ? String(data.role) : null;
}

async function getConsultation(projectId: string, token: string, id: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/consultations/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore_get_${res.status}`);
  const json = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
  return decodeFields(json.fields);
}

function encodeValue(v: unknown): Record<string, unknown> {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "boolean") return { booleanValue: v };
  return { stringValue: String(v) };
}

async function patchDocument(
  projectId: string,
  token: string,
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  const mask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}?${mask}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encodeValue(v)])),
    }),
  });
  if (!res.ok) throw new Error(`firestore_patch_${res.status}`);
}

async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  input: {
    startsAt: string;
    hours: number;
    clientEmail: string;
    clientName: string;
    notes?: string;
    company?: string;
  },
): Promise<{ eventId: string; meetUrl: string }> {
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + input.hours * 60 * 60 * 1000);
  const requestId = randomUUID();
  const descriptionParts = [
    `Exploratory consultation · ${input.hours} hour${input.hours === 1 ? "" : "s"} with CasinWorks.`,
    `Client: ${input.clientName}${input.company ? ` (${input.company})` : ""}`,
    input.notes ? `Notes: ${input.notes}` : "",
  ].filter(Boolean);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: "CasinWorks consultation",
        description: descriptionParts.join("\n"),
        start: { dateTime: start.toISOString(), timeZone: "Asia/Manila" },
        end: { dateTime: end.toISOString(), timeZone: "Asia/Manila" },
        attendees: [{ email: input.clientEmail, displayName: input.clientName }],
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: { useDefault: true },
      }),
    },
  );
  const json = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || `calendar_create_${res.status}`);
  }
  const meetFromEntry = json.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;
  const meetUrl = json.hangoutLink || meetFromEntry || "";
  if (!meetUrl) {
    throw new Error("Google Calendar created the event but did not return a Meet link");
  }
  return { eventId: json.id, meetUrl };
}

async function deleteCalendarEvent(accessToken: string, calendarId: string, eventId: string) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (res.status === 404 || res.status === 410) return;
  if (!res.ok) throw new Error(`calendar_delete_${res.status}`);
}
