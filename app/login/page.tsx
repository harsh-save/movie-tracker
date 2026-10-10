
"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        setError("Sign-in failed. Check your email and password.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const requestedPath = params.get("next") || "/library";

      // Only allow safe, same-site paths.
      const destination =
        requestedPath.startsWith("/") &&
        !requestedPath.startsWith("//") &&
        !requestedPath.startsWith("/login")
          ? requestedPath
          : "/library";

      router.replace(destination);
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[75vh] max-w-md items-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-7 shadow-xl"
      >
        <Link
          href="/library"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          ← Back to library
        </Link>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Sign in to manage your Movie Tracker collection.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/10"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/10"
            placeholder="Enter your password"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-xs text-gray-500">
          Owner access only
        </p>
      </form>
    </main>
  );
}
