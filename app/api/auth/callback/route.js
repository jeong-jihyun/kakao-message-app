import { NextResponse } from "next/server";
import { authorizeWithCode } from "../../../../lib/kakao.js";

export const dynamic = "force-dynamic";

function back(origin, params) {
  const url = new URL("/", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = NextResponse.redirect(url.toString());
  response.cookies.delete("kakao_state");
  return response;
}

// 카카오가 로그인 후 code 를 들고 돌아오는 곳 → 토큰으로 바꿔 저장소에 보관
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  const state = searchParams.get("state");
  const savedState = request.cookies.get("kakao_state")?.value;
  if (!state || !savedState || state !== savedState) {
    return back(origin, {
      error: "인증 시작 기록이 없습니다. 첫 화면에서 관리 키를 넣고 다시 시작해 주세요.",
    });
  }

  const code = searchParams.get("code");
  if (!code) {
    const err = searchParams.get("error_description") || searchParams.get("error") || "code 없음";
    return back(origin, { error: err });
  }

  try {
    await authorizeWithCode(code);
  } catch (e) {
    return back(origin, { error: e.message });
  }
  return back(origin, { authorized: "1" });
}
