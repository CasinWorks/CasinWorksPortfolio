import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageMeta } from "../../hooks/usePageMeta";
import { SITE } from "../../site";
import { usePortalAuth } from "../auth";
import {
  MESSAGE_MAX_LENGTH,
  ensureThread,
  listenMessages,
  listenThread,
  listenThreads,
  markThreadRead,
  sendMessage,
  threadHasUnread,
  threadIdForClient,
} from "../api";
import type { Message, MessageAuthor, MessageThread, PortalRole } from "../types";
import { StaggerItem, StaggerList } from "../motion";

export function viewerAuthor(role: PortalRole | undefined): MessageAuthor {
  return role === "admin" ? "admin" : "client";
}

function formatWhen(iso: string) {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const today = new Date();
  const sameDay =
    at.getFullYear() === today.getFullYear() &&
    at.getMonth() === today.getMonth() &&
    at.getDate() === today.getDate();
  return sameDay
    ? at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : at.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatStamp(iso: string) {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Thread list. Admins see every client; a client sees only their own. */
export function MessagesScreen() {
  usePageMeta({
    title: `Messages — Portal | ${SITE.name}`,
    path: "/portal/messages",
    noIndex: true,
  });

  const { profile } = usePortalAuth();
  const viewer = viewerAuthor(profile?.role);
  const isAdmin = viewer === "admin";
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    return listenThreads({ role: profile.role, email: profile.email }, setThreads, setError);
  }, [profile]);

  async function startOwnThread() {
    if (!profile) return;
    setError("");
    setStarting(true);
    try {
      await ensureThread({
        id: threadIdForClient(profile.uid),
        clientUid: profile.uid,
        clientEmail: profile.email,
        clientName: profile.displayName || profile.email,
        subject: "General",
        openedBy: "client",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the conversation.");
    } finally {
      setStarting(false);
    }
  }

  const ownThreadId = profile ? threadIdForClient(profile.uid) : "";
  const hasOwnThread = threads.some((t) => t.id === ownThreadId);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {isAdmin ? "Admin" : "Portal"}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">Messages.</h1>
        <p className="mt-3 text-slate-600 max-w-xl">
          {isAdmin
            ? "Every client conversation, newest first. A dot marks the ones waiting on you."
            : "Ask about scope, timelines, or a document. Replies land here and on your phone."}
        </p>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </div>

      {!isAdmin && !hasOwnThread && (
        <section className="border border-black/10 bg-white p-6 max-w-3xl">
          <h2 className="font-serif text-2xl font-semibold">Start a conversation</h2>
          <p className="mt-2 text-sm text-slate-600">
            Opens a direct thread with the studio. There is no charge for asking a question.
          </p>
          <button
            type="button"
            onClick={() => void startOwnThread()}
            disabled={starting}
            className="mt-5 rounded-full bg-black text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-50"
          >
            {starting ? "Opening…" : "Message the studio"}
          </button>
        </section>
      )}

      <section>
        {threads.length === 0 && (
          <p className="py-6 text-slate-500 border-y border-black/10 max-w-3xl">
            {isAdmin ? "No client has written yet." : "No messages yet."}
          </p>
        )}
        {threads.length > 0 && (
          <StaggerList className="divide-y divide-black/10 border-y border-black/10 max-w-3xl">
            {threads.map((t) => {
              const unread = threadHasUnread(t, viewer);
              return (
                <StaggerItem key={t.id}>
                  <Link
                    to={`/portal/messages/${t.id}`}
                    className="py-4 flex items-center justify-between gap-3 hover:bg-[var(--page-panel)]/80 min-h-12"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {unread && (
                          <span
                            className="size-2 shrink-0 rounded-full bg-black"
                            aria-label="Unread"
                          />
                        )}
                        <span className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>
                          {isAdmin ? t.clientName || t.clientEmail : t.projectName || t.subject}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 truncate">
                        {isAdmin && (t.projectName || t.subject)
                          ? `${t.projectName || t.subject} · `
                          : ""}
                        {t.lastMessagePreview || "No messages yet"}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatWhen(t.lastMessageAt)}
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </section>
    </div>
  );
}

/** One conversation, with the composer. */
export function ThreadScreen() {
  const { threadId = "" } = useParams();
  const { profile, firebaseUser } = usePortalAuth();
  const viewer = viewerAuthor(profile?.role);

  usePageMeta({
    title: `Conversation — Portal | ${SITE.name}`,
    path: `/portal/messages/${threadId}`,
    noIndex: true,
  });

  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadId) return;
    return listenThread(
      threadId,
      (row) => {
        setThread(row);
        setLoaded(true);
      },
      setError,
    );
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    return listenMessages(threadId, setMessages, setError);
  }, [threadId]);

  // Clearing the unread marker is keyed on the last message so reopening a quiet
  // thread does not write on every render.
  const lastMessageAt = thread?.lastMessageAt ?? "";
  useEffect(() => {
    if (!thread || !lastMessageAt) return;
    if (!threadHasUnread(thread, viewer)) return;
    void markThreadRead(thread.id, viewer).catch(() => undefined);
  }, [thread, lastMessageAt, viewer]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const heading = useMemo(() => {
    if (!thread) return "Conversation";
    if (viewer === "admin") return thread.clientName || thread.clientEmail;
    return thread.projectName || thread.subject;
  }, [thread, viewer]);

  if (loaded && !thread) {
    return (
      <div className="space-y-6">
        <Link to="/portal/messages" className="text-sm text-slate-500 hover:text-black">
          ← Messages
        </Link>
        <p className="py-6 text-slate-500 border-y border-black/10 max-w-3xl">
          This conversation is not available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link to="/portal/messages" className="text-sm text-slate-500 hover:text-black">
          ← Messages
        </Link>
        <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-semibold tracking-tight">{heading}</h1>
        {thread && viewer === "admin" && (
          <p className="mt-2 text-sm text-slate-500">
            {thread.clientEmail}
            {thread.projectName ? ` · ${thread.projectName}` : ""}
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      </div>

      <div className="border-y border-black/10 divide-y divide-black/[0.06]">
        {messages.length === 0 && (
          <p className="py-6 text-slate-500">
            No messages yet. Write the first one below.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderRole === viewer;
          return (
            <div key={m.id} className="py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {mine ? "You" : m.senderRole === "admin" ? SITE.brand : m.senderName}
                </span>
                <span className="text-xs text-slate-400 shrink-0">{formatStamp(m.createdAt)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                {m.body}
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {thread && profile && (
        <Composer
          onSend={async (body) => {
            const idToken = await firebaseUser?.getIdToken().catch(() => undefined);
            await sendMessage({
              threadId: thread.id,
              body,
              senderUid: profile.uid,
              senderName: profile.displayName || profile.email,
              senderRole: viewer,
              idToken: idToken || undefined,
            });
          }}
        />
      )}
    </div>
  );
}

function Composer({ onSend }: { onSend: (body: string) => Promise<void> }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!body.trim() || sending) return;
    setError("");
    setSending(true);
    try {
      await onSend(body);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  // Enter sends, Shift+Enter breaks the line — what people expect of a composer.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <form onSubmit={onFormSubmit} className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
        maxLength={MESSAGE_MAX_LENGTH}
        placeholder="Write a message…"
        className="w-full px-3.5 py-2.5 bg-white border border-black/15 text-sm resize-y min-h-[5rem]"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">Enter sends · Shift+Enter for a new line</span>
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-full bg-black text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
