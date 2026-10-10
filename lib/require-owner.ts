
import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";

export async function requireOwner() {
  const ownerId = process.env.OWNER_USER_ID;

  if (!ownerId) {
    console.error("OWNER_USER_ID is not configured.");

    return {
      response: NextResponse.json(
        { error: "Server authorization is not configured." },
        { status: 500 }
      ),
    };
  }

  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      response: NextResponse.json(
        { error: "Please sign in to perform this action." },
        { status: 401 }
      ),
    };
  }

  if (data.user.id !== ownerId) {
    return {
      response: NextResponse.json(
        { error: "You are not authorized to perform this action." },
        { status: 403 }
      ),
    };
  }

  return { response: null, user: data.user };
}
