
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/require-owner";

export async function GET() {
  const auth = await requireOwner();

  if (auth.response) {
    return NextResponse.json(
      { isOwner: false },
      { status: auth.response.status }
    );
  }

  return NextResponse.json({ isOwner: true });
}
