"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SealMark from "@/components/SealMark";
import styles from "./room.module.css";

type Session = { sessionToken: string; slot: 1 | 2; name: string };
type Msg = { id: string; slot: 1 | 2; name: string; text: string; ts: number };
type Participant = { slot: 1 | 2; name: string; lastReadTs: number };

const POLL_MS = 1500;
const TYPING_PING_MS = 1800;
const EMOJIS = [
  "😀", "😂", "🥹", "😍", "😘", "😉",
  "😮", "😢", "😡", "🤔", "👀", "🔥",
  "💛", "💜", "❤️", "👍", "🙏", "🎉",
];

export default function RoomPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();

  const [session, setSession] = useState<Session | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(`ebeyschat:${code}`);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    setCheckedStorage(true);
  }, [code]);

  if (!checkedStorage) return null;

  if (!session) {
    return (
      <EntryGate
        code={code}
        onEntered={(s) => {
          localStorage.setItem(`ebeyschat:${code}`, JSON.stringify(s));
          setSession(s);
        }}
      />
    );
  }

  return (
    <ChatRoom
      code={code}
      session={session}
      onKicked={() => {
        localStorage.removeItem(`ebeyschat:${code}`);
        setSession(null);
      }}
    />
  );
}

function EntryGate({
  code,
  onEntered,
}: {
  code: string;
  onEntered: (s: Session) => void;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${code}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't enter.");
        setLoading(false);
        return;
      }
      onEntered({ sessionToken: data.sessionToken, slot: data.slot, name: data.name });
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.gateMain}>
      <div className={styles.gateCard}>
        <SealMark size={48} state="question" />
        <p className={styles.gateCode}>{code}</p>
        <h1 className={styles.gateTitle}>Show your key</h1>
        <p className={styles.gateSub}>
          Use the same name and password you set when you joined this room.
        </p>
        <form className={styles.gateForm} onSubmit={handleSubmit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            required
            autoComplete="off"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            minLength={4}
            required
            autoComplete="current-password"
          />
          {error && <p className={styles.gateError}>{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </main>
  );
}

function ChatRoom({
  code,
  session,
  onKicked,
}: {
  code: string;
  session: Session;
  onKicked: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const lastTypingPing = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // restore mute preference
  useEffect(() => {
    setMuted(localStorage.getItem("ebeyschat:muted") === "1");
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // close popovers on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function playBeep() {
    if (muted) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 720;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.33);
    } catch {
      /* ignore audio failures */
    }
  }

  function notify(name: string, text: string) {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;
    try {
      new Notification(`${name} · EbEy-ScHaT`, { body: text });
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch(`/api/room/${code}/messages`, {
          headers: { "x-session-token": session.sessionToken },
          cache: "no-store",
        });
        if (res.status === 401) {
          onKicked();
          return;
        }
        if (res.status === 404) {
          onKicked();
          return;
        }
        const data = await res.json();
        if (stopped) return;

        const incoming: Msg[] = data.messages || [];
        if (!firstLoad.current) {
          const fresh = incoming.filter(
            (m) => !knownIds.current.has(m.id) && m.slot !== session.slot
          );
          if (fresh.length > 0) {
            playBeep();
            const last = fresh[fresh.length - 1];
            notify(last.name, last.text);
          }
        }
        incoming.forEach((m) => knownIds.current.add(m.id));
        firstLoad.current = false;

        setMessages(incoming);
        setParticipants(data.participants || []);
        setPartnerTyping(Boolean(data.partnerTyping));
      } catch {
        /* network hiccup, just retry next tick */
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, session.sessionToken, muted]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function pingTyping() {
    const now = Date.now();
    if (now - lastTypingPing.current < TYPING_PING_MS) return;
    lastTypingPing.current = now;
    fetch(`/api/room/${code}/typing`, {
      method: "POST",
      headers: { "x-session-token": session.sessionToken },
    }).catch(() => {});
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setEmojiOpen(false);
    await fetch(`/api/room/${code}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": session.sessionToken,
      },
      body: JSON.stringify({ text }),
    });
  }

  function copyInvite() {
    navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("ebeyschat:muted", next ? "1" : "0");
    setMenuOpen(false);
  }

  async function clearChat() {
    setMenuOpen(false);
    if (!window.confirm("Clear this chat for both of you? This can't be undone.")) return;
    await fetch(`/api/room/${code}/messages`, {
      method: "DELETE",
      headers: { "x-session-token": session.sessionToken },
    });
    setMessages([]);
    knownIds.current.clear();
  }

  async function endRoom() {
    setMenuOpen(false);
    if (
      !window.confirm(
        "End this room for both of you? The code will stop working and all messages will be gone."
      )
    )
      return;
    await fetch(`/api/room/${code}`, {
      method: "DELETE",
      headers: { "x-session-token": session.sessionToken },
    });
    localStorage.removeItem(`ebeyschat:${code}`);
    router.push("/");
  }

  const sealed = participants.length >= 2;
  const partner = participants.find((p) => p.slot !== session.slot);

  // does the partner's read receipt cover my most recent message?
  const myMessages = messages.filter((m) => m.slot === session.slot);
  const myLastMsg = myMessages[myMessages.length - 1];
  const seenByPartner =
    !!myLastMsg && !!partner && partner.lastReadTs >= myLastMsg.ts;

  return (
    <main className={styles.roomMain}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <SealMark size={32} state={sealed ? "sealed" : "waiting"} />
          <div>
            <p className={styles.roomCode}>{code}</p>
            <p className={styles.roomStatus}>
              {sealed ? `Sealed — you and ${partner?.name}` : "Waiting for the second key…"}
            </p>
          </div>
        </div>
        <div className={styles.headerRight} ref={menuRef}>
          <button className={styles.copyBtn} onClick={copyInvite} type="button">
            {copied ? "Copied" : "Copy invite"}
          </button>
          <button
            className={styles.iconBtn}
            type="button"
            aria-label="Room menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className={styles.menuDropdown}>
              <button className={styles.menuItem} onClick={toggleMute} type="button">
                <span>{muted ? "Unmute sound" : "Mute sound"}</span>
                <span>{muted ? "🔇" : "🔔"}</span>
              </button>
              <button className={styles.menuItem} onClick={clearChat} type="button">
                <span>Clear chat</span>
                <span>🧹</span>
              </button>
              <button
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={endRoom}
                type="button"
              >
                <span>End room</span>
                <span>✕</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.thread}>
        {messages.length === 0 && (
          <p className={styles.empty}>
            {sealed
              ? "No messages yet. Say something."
              : "Share the room code with the other person — once they set their password, you're both sealed in."}
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.slot === session.slot;
          const isMyLast = mine && m.id === myLastMsg?.id;
          return (
            <div
              key={m.id}
              className={mine ? styles.bubbleRowMine : styles.bubbleRow}
            >
              <div
                className={mine ? styles.bubbleMine : styles.bubbleTheirs}
                data-slot={m.slot}
              >
                {!mine && <p className={styles.bubbleName}>{m.name}</p>}
                <p className={styles.bubbleText}>{m.text}</p>
                <p className={styles.bubbleTime}>
                  {new Date(m.ts).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {isMyLast && seenByPartner && (
                <p className={styles.seenText}>Seen</p>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {partnerTyping && (
        <p className={styles.typingIndicator}>{partner?.name || "They"} are typing…</p>
      )}

      <div className={styles.composerWrap} ref={emojiRef}>
        {emojiOpen && (
          <div className={styles.emojiPopover}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className={styles.emojiItem}
                onClick={() => setDraft((d) => d + e)}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <form className={styles.composer} onSubmit={sendMessage}>
          <button
            type="button"
            className={styles.emojiBtn}
            aria-label="Emoji picker"
            onClick={() => setEmojiOpen((v) => !v)}
          >
            🙂
          </button>
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              pingTyping();
            }}
            placeholder={sealed ? "Write something…" : "You can write — they'll see it once they join"}
            maxLength={2000}
            autoComplete="off"
          />
          <button type="submit" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
