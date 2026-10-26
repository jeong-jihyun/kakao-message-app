import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get("kakao_access_token")?.value;
  return NextResponse.json({ loggedIn: !!token });
}
