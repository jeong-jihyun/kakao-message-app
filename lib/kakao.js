// 카카오 로그인 토큰 발급·갱신, "나에게 보내기" 호출
import { loadTokens, saveTokens } from "./store.js";

const authBase = () => process.env.KAKAO_AUTH_BASE || "https://kauth.kakao.com";
const apiBase = () => process.env.KAKAO_API_BASE || "https://kapi.kakao.com";

export class KakaoError extends Error {
  constructor(message, { status = 502, code = "KAKAO_ERROR", needsAuth = false } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.needsAuth = needsAuth;
  }
}

async function tokenRequest(params) {
  const body = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY || "",
    ...params,
  });
  if (process.env.KAKAO_CLIENT_SECRET) body.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  const res = await fetch(`${authBase()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok && !!data.access_token, status: res.status, data };
}

function describe(data) {
  const parts = [data.error_description || data.error || "알 수 없는 오류"];
  if (data.error_code) parts.push(`(${data.error_code})`);
  return parts.join(" ");
}

// 카카오가 준 값을 저장용 모양으로 바꾼다. 갱신 때 새 리프레시 토큰이 없으면 이전 것을 그대로 쓴다.
function toRecord(data, prev) {
  const now = Date.now();
  return {
    access_token: data.access_token,
    access_expires_at: now + (data.expires_in || 21599) * 1000,
    refresh_token: data.refresh_token || prev?.refresh_token,
    refresh_expires_at: data.refresh_token
      ? now + (data.refresh_token_expires_in || 5183999) * 1000
      : prev?.refresh_expires_at,
    scope: data.scope || prev?.scope,
    updated_at: new Date(now).toISOString(),
  };
}

// 최초 인증: 로그인 후 받은 code 를 토큰으로 바꿔 저장
export async function authorizeWithCode(code) {
  const r = await tokenRequest({
    grant_type: "authorization_code",
    redirect_uri: process.env.KAKAO_REDIRECT_URI || "",
    code,
  });
  if (!r.ok) {
    throw new KakaoError(describe(r.data), { status: 400, code: r.data.error_code || "AUTH_FAILED" });
  }
  const record = toRecord(r.data, null);
  await saveTokens(record);
  return record;
}

async function refresh(prev) {
  if (!prev?.refresh_token) {
    throw new KakaoError("최초 인증이 필요합니다", {
      status: 409,
      code: "NOT_AUTHORIZED",
      needsAuth: true,
    });
  }
  const r = await tokenRequest({ grant_type: "refresh_token", refresh_token: prev.refresh_token });
  if (!r.ok) {
    const dead = r.data.error === "invalid_grant" || r.status === 400 || r.status === 401;
    throw new KakaoError(`토큰 갱신 실패: ${describe(r.data)}`, {
      status: dead ? 409 : 502,
      code: dead ? "REFRESH_EXPIRED" : r.data.error_code || "REFRESH_FAILED",
      needsAuth: dead,
    });
  }
  const record = toRecord(r.data, prev);
  await saveTokens(record); // 보내기 전에 먼저 저장해서, 새 리프레시 토큰을 잃지 않게 한다
  return record;
}

// card 가 있으면 이미지+제목+설명 카드(feed), 없으면 글 말풍선(text)
function buildTemplate(text, link, card) {
  const lk = { web_url: link, mobile_web_url: link };
  if (card?.image) {
    return {
      object_type: "feed",
      content: {
        title: String(card.title || text).slice(0, 200),
        description: String(card.description || "").slice(0, 200) || undefined,
        image_url: card.image,
        image_width: 800,
        image_height: 400,
        link: lk,
      },
      buttons: [{ title: "자세히 보기", link: lk }],
    };
  }
  return { object_type: "text", text: String(text).slice(0, 200), link: lk };
}

async function sendMemo(accessToken, text, link, card) {
  const template = buildTemplate(text, link, card);
  const res = await fetch(`${apiBase()}/v2/api/talk/memo/default/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

// 나에게 카카오톡 보내기 (필요하면 토큰을 알아서 갱신)
export async function sendToMe({ text, link, card }) {
  let tokens = await loadTokens();
  if (!tokens?.refresh_token) {
    throw new KakaoError("최초 인증이 필요합니다", {
      status: 409,
      code: "NOT_AUTHORIZED",
      needsAuth: true,
    });
  }
  let refreshed = false;
  if (!tokens.access_token || (tokens.access_expires_at || 0) - 60_000 < Date.now()) {
    tokens = await refresh(tokens);
    refreshed = true;
  }
  let r = await sendMemo(tokens.access_token, text, link, card);
  if (r.status === 401 && !refreshed) {
    tokens = await refresh(tokens);
    refreshed = true;
    r = await sendMemo(tokens.access_token, text, link, card);
  }
  if (!r.ok) {
    const msg = r.data.msg || r.data.error_description || "전송 실패";
    throw new KakaoError(`${msg} (HTTP ${r.status}${r.data.code ? `, code ${r.data.code}` : ""})`, {
      status: r.status === 401 ? 409 : 502,
      code: r.data.code ? String(r.data.code) : "SEND_FAILED",
      needsAuth: r.status === 401,
    });
  }
  return { refreshed, refreshExpiresAt: tokens.refresh_expires_at };
}

export async function authStatus() {
  const t = await loadTokens();
  return {
    authorized: !!t?.refresh_token,
    refreshExpiresAt: t?.refresh_expires_at ? new Date(t.refresh_expires_at).toISOString() : null,
    updatedAt: t?.updated_at || null,
  };
}
