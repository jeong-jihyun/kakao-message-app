// 카카오톡 나에게 보내기 공통 처리 (주소 /api/notify 와 AI 도구(MCP)가 함께 쓴다)
import { sendToMe, KakaoError } from "./kakao.js";
import { saveMessage, MAX_DETAIL } from "./messages.js";
import { fetchPreview, isPublicHttps } from "./og.js";
import { pushToPhone } from "./ntfy.js";

// 링크 기본 주소: 카카오 콘솔에 등록한 주소(리다이렉트 URI 의 도메인)를 우선 쓴다
export function baseUrl(requestUrl) {
  try {
    if (process.env.KAKAO_REDIRECT_URI) return new URL(process.env.KAKAO_REDIRECT_URI).origin;
  } catch {}
  return new URL(requestUrl).origin;
}

// 키 확인은 부르는 쪽에서 끝낸 뒤 호출한다. 반환: { status, body }
export async function deliver({ base, text, link, detail, title, desc, image }) {
  const message = (text || "").toString().trim();
  if (!message) return { status: 400, body: { ok: false, error: "text(보낼 내용)가 비어 있습니다." } };

  // 카카오톡 말풍선에는 200자까지만 들어간다. 넘으면 줄이고, 전체는 '자세히 보기'에 둔다.
  const truncated = message.length > 200;
  const shown = truncated ? message.slice(0, 199) + "…" : message;

  // 링크를 직접 주면 그 링크를, 안 주면 이 메시지의 전문을 보여 주는 상세 화면을 연다.
  const userLink = link && /^https?:\/\//.test(link) ? link : null;
  let safeLink = null;
  let detailSaved = false;
  // 카카오는 등록한 도메인(이 앱 주소)의 링크만 정상으로 열어 준다.
  // 그래서 다른 사이트 링크도 이 앱의 /m/<난수> 를 거쳐 원래 링크로 넘어가게 한다.
  const full = (detail || "").toString().trim() || message;
  try {
    const id = await saveMessage({
      text: shown,
      detail: full.slice(0, MAX_DETAIL),
      redirect: userLink || undefined,
    });
    safeLink = `${base}/m/${id}`;
    detailSaved = !userLink;
  } catch {
    safeLink = userLink || base; // 저장에 실패해도 알림은 보낸다
  }

  // 카드(이미지+제목+설명): image 를 직접 주거나, link 를 주면 그 페이지의 미리보기 정보를 가져와 쓴다.
  let card = null;
  let cardImage = image && isPublicHttps(image) ? image : "";
  let cardTitle = (title || "").toString().trim();
  let cardDesc = (desc || "").toString().trim();
  if (userLink && (!cardImage || !cardTitle || !cardDesc)) {
    const pv = await fetchPreview(userLink);
    if (pv) {
      cardImage = cardImage || pv.image;
      cardTitle = cardTitle || pv.title;
      cardDesc = cardDesc || pv.description;
    }
  }
  if (cardImage) {
    card = {
      image: cardImage,
      title: cardTitle || shown.split("\n")[0],
      description: cardDesc || (cardTitle ? shown : ""),
    };
  }

  // 폰 푸시(ntfy)는 카카오와 따로 보낸다. 실패해도 카카오 발송에는 영향 없다.
  const pushPromise = pushToPhone({ text: shown, link: safeLink });

  try {
    const r = await sendToMe({ text: shown, link: safeLink, card });
    const push = await pushPromise;
    return {
      status: 200,
      body: {
        ok: true,
        push,
        sent: shown.length,
        truncated,
        detail: detailSaved,
        card: !!card,
        tokenRefreshed: r.refreshed,
      },
    };
  } catch (e) {
    const push = await pushPromise;
    if (e instanceof KakaoError) {
      return {
        status: e.status,
        body: { ok: false, error: e.message, code: e.code, needsAuth: e.needsAuth, push },
      };
    }
    return { status: 500, body: { ok: false, error: e.message || "알 수 없는 오류" } };
  }
}
