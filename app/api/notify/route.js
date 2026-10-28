import { NextResponse } from "next/server";
import { sendToMe, KakaoError } from "../../../lib/kakao.js";
import { keyIsValid } from "../../../lib/guard.js";

export const dynamic = "force-dynamic";

function fail(status, error, extra = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

async function handle(request, { key, text, link }) {
  if (!process.env.NOTIFY_SECRET) return fail(500, "서버에 NOTIFY_SECRET 환경변수가 없습니다.");
  if (!keyIsValid(key)) return fail(401, "관리 키가 맞지 않습니다.");

  const message = (text || "").toString().trim();
  if (!message) return fail(400, "text(보낼 내용)가 비어 있습니다.");

  // 링크를 안 주면 이 앱 주소를 쓴다 (카카오 콘솔 '제품 링크 관리'에 등록한 주소)
  const safeLink = link && /^https?:\/\//.test(link) ? link : new URL(request.url).origin;

  try {
    const r = await sendToMe({ text: message, link: safeLink });
    return NextResponse.json({
      ok: true,
      sent: message.slice(0, 200).length,
      truncated: message.length > 200,
      tokenRefreshed: r.refreshed,
    });
  } catch (e) {
    if (e instanceof KakaoError) {
      return fail(e.status, e.message, { code: e.code, needsAuth: e.needsAuth });
    }
    return fail(500, e.message || "알 수 없는 오류");
  }
}

// 주소로 보내기: /api/notify?key=관리키&text=내용  (예약 작업·스킬에서 쓰기 쉬운 방식)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  return handle(request, {
    key: searchParams.get("key") || request.headers.get("x-notify-key"),
    text: searchParams.get("text"),
    link: searchParams.get("link"),
  });
}

// 본문으로 보내기: 헤더 x-notify-key + JSON { text, link }
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {}
  return handle(request, {
    key: request.headers.get("x-notify-key") || body.key,
    text: body.text,
    link: body.link,
  });
}
