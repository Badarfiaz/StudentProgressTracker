"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpenCheck, FileUp, House, ListFilter, LogIn, LogOut, Type, UserRound } from "lucide-react";
import { firebaseConfigured } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { Modal } from "./Modal";
import { SignIn } from "./SignIn";
import { useStudent } from "./StudentProvider";
import { StudentForm } from "./StudentForm";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/upload", label: "Add results", icon: FileUp },
  { href: "/records", label: "All tests", icon: ListFilter },
  { href: "/settings", label: "My child", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { student, loading, error } = useStudent();
  const { user, isAdmin, logout } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [large, setLarge] = useState(false);

  useEffect(() => {
    try { setLarge(localStorage.getItem("pd-large") === "1"); } catch {}
  }, []);
  useEffect(() => {
    if (user) setSignInOpen(false);
  }, [user]);
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", large);
    try { localStorage.setItem("pd-large", large ? "1" : "0"); } catch {}
  }, [large]);

  let content: React.ReactNode = children;
  if (!firebaseConfigured) content = <SetupNotice />;
  else if (error && !student) content = <ErrorNotice message={error} />;
  else if (loading) content = <LoadingState />;
  else if (!student) content = <Welcome />;

  const showNav = firebaseConfigured && !!student;

  return (
    <div className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:h-16 sm:gap-6 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-display text-base font-bold sm:gap-2.5 sm:text-lg">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-marker">
              <BookOpenCheck size={19} strokeWidth={2.4} />
            </span>
            <span className="truncate">Progress Diary</span>
          </Link>
          <button
            type="button"
            onClick={() => setLarge((v) => !v)}
            aria-pressed={large}
            title="Make text bigger"
            className={`no-print ml-auto flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold md:order-last md:ml-0 ${
              large ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:text-ink"
            }`}
          >
            <Type size={16} />
            <span className="max-sm:sr-only">{large ? "Normal text" : "Bigger text"}</span>
          </button>
          {firebaseConfigured && (
            <button
              type="button"
              onClick={user ? logout : () => setSignInOpen(true)}
              title={user ? `${user.email ?? ""}${isAdmin ? " (admin)" : ""}` : "Admin sign in"}
              className="no-print flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink md:order-last"
            >
              {user ? <LogOut size={16} /> : <LogIn size={16} />}
              <span className="max-sm:sr-only">{user ? "Sign out" : "Sign in"}</span>
            </button>
          )}
          {showNav && (
            <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                      active ? "bg-ink text-white" : "text-ink-soft hover:bg-white hover:text-ink"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <Modal open={signInOpen} onClose={() => setSignInOpen(false)} title="Admin sign in">
        <SignIn />
      </Modal>

      <main className="mx-auto max-w-6xl overflow-x-clip px-4 py-5 sm:px-6 sm:py-10">{content}</main>

      {firebaseConfigured && (
        <nav
          className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Main"
        >
          <div className="grid grid-cols-4">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-xs font-bold ${active ? "text-ink" : "text-ink-faint"}`}
                >
                  <span className={`rounded-full px-4 py-1 ${active ? "bg-marker" : ""}`}>
                    <Icon size={20} />
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function Welcome() {
  return (
    <div className="mx-auto grid max-w-4xl gap-10 py-6 md:grid-cols-[1.1fr_1fr] md:items-center">
      <div className="animate-rise">
        <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">
          Every test result, <span className="marked">in one place.</span>
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
          Add your child once. After that, drop in the class result sheets from school and Progress Diary picks
          out their row, subject by subject.
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-faint">
          Sheets are read on this device and never stored. Only your child&apos;s marks are saved.
        </p>
      </div>
      <div className="panel p-6 shadow-lift sm:p-7">
        <h2 className="text-xl font-bold">Who are you following?</h2>
        <p className="mt-1 mb-5 text-sm text-ink-soft">Use the Reg. ID exactly as it appears on the result sheet.</p>
        <StudentForm submitLabel="Start tracking" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-line/70" />
      <div className="h-32 animate-pulse rounded-2xl bg-line/50" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-line/50" />
        <div className="h-64 animate-pulse rounded-2xl bg-line/50" />
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="panel mx-auto max-w-xl p-7">
      <h1 className="text-2xl font-bold">Connect Firebase to begin</h1>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-soft">
        <li>Copy <code className="rounded bg-paper px-1.5">.env.example</code> to <code className="rounded bg-paper px-1.5">.env.local</code>.</li>
        <li>Paste your Firebase web app config values into it.</li>
        <li>Restart <code className="rounded bg-paper px-1.5">npm run dev</code>.</li>
      </ol>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="panel mx-auto max-w-xl border-bad/30 p-7">
      <h1 className="text-2xl font-bold">Firestore didn&apos;t respond</h1>
      <p className="mt-2 text-ink-soft">
        Check that Firestore is enabled for this project and that the rules in <code>firestore.rules</code> are published.
      </p>
      <p className="mt-4 rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{message}</p>
    </div>
  );
}
