import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { keyIsValid } from "../../../../lib/guard.js";

export const dynamic = "force-dynamic"; // 빌드 때 고정하지 않고 요청마다 환경변수를 읽음

// 최초 인증 시작: 관리 키가 맞을 때만 카카오 로그인 화면으로 보낸다.
// (아무나 로그인해서 내 토큰을 덮어쓰지 못하게 하기 위함)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (!keyIsValid(searchParams.get("key"))) {
    return NextResponse.json({ error: "관리 키가 맞지 않습니다." }, { status: 401 });
  }

  const clientId = process.env.KAKAO_REST_API_KEY;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY / KAKAO_REDIRECT_URI 환경변수가 없습니다." },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const authBase = process.env.KAKAO_AUTH_BASE || "https://kauth.kakao.com";
  const url = new URL(`${authBase}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "talk_message"); // 카카오톡 메시지 전송 권한
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url.toString());
  response.cookies.set("kakao_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
