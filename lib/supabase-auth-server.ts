
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Some server-rendering contexts do not allow cookie writes.
            // A request handler can write refreshed cookies when supported.
          }
        },
      },
    }
  );
}
