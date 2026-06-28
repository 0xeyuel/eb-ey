"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SealMark from "@/components/SealMark";
import styles from "./page.module.css";

type Mode = "open" | "enter";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("open");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "open" ? "/api/room" : `/api/room/${code.trim().toUpperCase()}/enter`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      localStorage.setItem(
        `ebeyschat:${data.code}`,
        JSON.stringify({ sessionToken: data.sessionToken, slot: data.slot, name: data.name })
      );
      router.push(`/room/${data.code}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <SealMark size={56} state={mode === "open" ? "single" : "question"} />
        <h1 className={styles.title}>EbEy-ScHaT</h1>
        <p className={styles.tagline}>two keys, one door.</p>

        <div className={styles.tabs} role="tablist" aria-label="Choose an action">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "open"}
            className={mode === "open" ? styles.tabActive : styles.tab}
            onClick={() => {
              setMode("open");
              setError(null);
            }}
          >
            Open a room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "enter"}
            className={mode === "enter" ? styles.tabActive : styles.tab}
            onClick={() => {
              setMode("enter");
              setError(null);
            }}
          >
            Enter with a code
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === "enter" && (
            <label className={styles.field}>
              <span>Room code</span>
              <input
                className={styles.codeInput}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="7K3PMN"
                maxLength={6}
                required
                autoComplete="off"
              />
            </label>
          )}

          <label className={styles.field}>
            <span>Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Just for this room"
              maxLength={24}
              required
              autoComplete="off"
            />
          </label>

          <label className={styles.field}>
            <span>Your own password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 4 characters"
              minLength={4}
              required
              autoComplete="new-password"
            />
            <small className={styles.hint}>
              The other person sets a different one. Neither of you can see it.
            </small>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading
              ? "One moment…"
              : mode === "open"
              ? "Open the room"
              : "Step inside"}
          </button>
        </form>

        <p className={styles.footnote}>
          A room holds exactly two people. Once you're both in, no one else can join —
          even with the code.
        </p>
      </div>
    </main>
  );
}
