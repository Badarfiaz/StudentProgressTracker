"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email or password isn't right.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a minute and try again.",
  "auth/popup-closed-by-user": "Google sign-in was closed before it finished.",
  "auth/operation-not-allowed": "This sign-in method isn't switched on yet in Firebase.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
};
const explain = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? "";
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
};

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await signInWithEmailAndPassword(auth(), email.trim(), password);
    });
  };

  const google = () => run(async () => void (await signInWithPopup(auth(), new GoogleAuthProvider())));

  const reset = () => {
    if (!email.trim()) return setError("Type your email above first, then press this again.");
    run(async () => {
      await sendPasswordResetEmail(auth(), email.trim());
      setInfo("Password reset email sent. Check your inbox.");
    });
  };

  return (
    <div>
      <div>
        <button type="button" onClick={google} disabled={busy} className="btn-outline w-full py-3 text-base">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
            <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold text-ink-faint">
          <span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
          {info && <p role="status" className="rounded-xl bg-ok-soft px-3.5 py-2.5 text-sm text-ok">{info}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>

        <div className="mt-4 text-sm">
          <button type="button" className="text-ink-soft hover:underline" onClick={reset}>Forgot password?</button>
        </div>
      </div>
    </div>
  );
}
