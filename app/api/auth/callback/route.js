import { NextResponse } from "next/server";

// 카카오가 로그인 후 code 를 들고 돌아오는 곳 → 토큰으로 교환
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    const err = searchParams.get("error_description") || "code 없음";
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(err)}`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) {
    body.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  }

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const err = data.error_description || "토큰 발급 실패";
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(err)}`);
  }

  const response = NextResponse.redirect(`${origin}/`);
  // 브라우저 자바스크립트가 못 읽도록 httpOnly 쿠키에 저장
  response.cookies.set("kakao_access_token", data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: data.expires_in || 21600,
  });
  return response;
}
