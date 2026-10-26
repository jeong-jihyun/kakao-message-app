import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // 빌드 때 고정하지 않고 요청마다 환경변수를 읽음

// 카카오 로그인 화면으로 보내기
export async function GET() {
  const clientId = process.env.KAKAO_REST_API_KEY;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: ".env 에 KAKAO_REST_API_KEY / KAKAO_REDIRECT_URI 를 먼저 넣어 주세요." },
      { status: 500 }
    );
  }
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "talk_message"); // 카카오톡 메시지 전송 권한
  return NextResponse.redirect(url.toString());
}
