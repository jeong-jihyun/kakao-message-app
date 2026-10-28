import { NextResponse } from "next/server";
import { sendToMe, KakaoError } from "../../../lib/kakao.js";
import { keyIsValid } from "../../../lib/guard.js";
import { saveMessage, MAX_DETAIL } from "../../../lib/messages.js";
import { fetchPreview, isPublicHttps } from "../../../lib/og.js";

export const dynamic = "force-dynamic";

function fail(status, error, extra = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

// 링크 기본 주소: 카카오 콘솔에 등록한 주소(리다이렉트 URI 의 도메인)를 우선 쓴다
function baseUrl(request) {
  try {
    if (process.env.KAKAO_REDIRECT_URI) return new URL(process.env.KAKAO_REDIRECT_URI).origin;
  } catch {}
  return new URL(request.url).origin;
}

async function handle(request, { key, text, link, detail, title, desc, image }) {
  if (!process.env.NOTIFY_SECRET) return fail(500, "서버에 NOTIFY_SECRET 환경변수가 없습니다.");
  if (!keyIsValid(key)) return fail(401, "관리 키가 맞지 않습니다.");

  const message = (text || "").toString().trim();
  if (!message) return fail(400, "text(보낼 내용)가 비어 있습니다.");

  // 카카오톡 말풍선에는 200자까지만 들어간다. 넘으면 줄이고, 전체는 '자세히 보기'에 둔다.
  const truncated = message.length > 200;
  const shown = truncated ? message.slice(0, 199) + "…" : message;

  // 링크를 직접 주면 그 링크를, 안 주면 이 메시지의 전문을 보여 주는 상세 화면을 연다.
  const base = baseUrl(request);
  let safeLink = link && /^https?:\/\//.test(link) ? link : null;
  let detailSaved = false;
  if (!safeLink) {
    const full = (detail || "").toString().trim() || message;
    try {
      const id = await saveMessage({ text: shown, detail: full.slice(0, MAX_DETAIL) });
      safeLink = `${base}/m/${id}`;
      detailSaved = true;
    } catch {
      safeLink = base; // 저장에 실패해도 알림은 보낸다
    }
  }

  // 카드(이미지+제목+설명): image 를 직접 주거나, link 를 주면 그 페이지의 미리보기 정보를 가져와 쓴다.
  let card = null;
  let cardImage = image && isPublicHttps(image) ? image : "";
  let cardTitle = (title || "").toString().trim();
  let cardDesc = (desc || "").toString().trim();
  if (link && /^https?:\/\//.test(link) && (!cardImage || !cardTitle || !cardDesc)) {
    const pv = await fetchPreview(link);
    if (pv) {
      cardImage = cardImage || pv.image;
      cardTitle = cardTitle || pv.title;
      cardDesc = cardDesc || pv.description;
    }
  }
  if (cardImage) card = { image: cardImage, title: cardTitle || shown.split("\n")[0], description: cardDesc || (cardTitle ? shown : "") };

  try {
    const r = await sendToMe({ text: shown, link: safeLink, card });
    return NextResponse.json({
      ok: true,
      sent: shown.length,
      truncated,
      detail: detailSaved,
      card: !!card,
      tokenRefreshed: r.refreshed,
    });
  } catch (e) {
    if (e instanceof KakaoError) {
      return fail(e.status, e.message, { code: e.code, needsAuth: e.needsAuth });
    }
    return fail(500, e.message || "알 수 없는 오류");
  }
}

// 주소로 보내기: /api/notify?key=관리키&text=내용 (선택: &detail=자세히 보기에 보여 줄 긴 내용, &link=직접 지정한 링크)  (예약 작업·스킬에서 쓰기 쉬운 방식)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  return handle(request, {
    key: searchParams.get("key") || request.headers.get("x-notify-key"),
    text: searchParams.get("text"),
    link: searchParams.get("link"),
    detail: searchParams.get("detail"),
    title: searchParams.get("title"),
    desc: searchParams.get("desc"),
    image: searchParams.get("image"),
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
    detail: body.detail,
    title: body.title,
    desc: body.desc,
    image: body.image,
  });
}
