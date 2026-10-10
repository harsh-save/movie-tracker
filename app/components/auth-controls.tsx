
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthControls() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);

    if (error) return;

    setUser(null);
    router.replace("/library");
    router.refresh();
  }

  if (!ready) {
    return <div className="h-9 w-20" aria-hidden="true" />;
  }

  if (!user) {
    const returnTo =
      pathname && pathname !== "/login" ? pathname : "/library";

    return (
      <Link
        href={`/login?next=${encodeURIComponent(returnTo)}`}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
      >
        <span aria-hidden="true">↗</span>
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-sm text-gray-400 sm:inline">
        {user.email}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
