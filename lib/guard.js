import crypto from "node:crypto";

// 길이가 달라도 같은 시간이 걸리도록 해시해서 비교한다.
function same(given, secret) {
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(String(secret)).digest();
  return crypto.timingSafeEqual(a, b);
}

// AI용 키 목록: HUB_API_KEYS="claude:키1,gemini:키2,chatgpt:키3" (이름:키, 쉼표로 구분)
// 예전 방식 HUB_API_KEY 한 개도 그대로 쓸 수 있다. 새어 나간 AI 의 항목만 지우면 된다.
function hubKeys() {
  const list = [];
  for (const item of String(process.env.HUB_API_KEYS || "").split(",")) {
    const t = item.trim();
    if (!t) continue;
    const i = t.indexOf(":");
    list.push(i > 0 ? { name: t.slice(0, i), key: t.slice(i + 1) } : { name: "hub", key: t });
  }
  if (process.env.HUB_API_KEY) list.push({ name: "hub", key: process.env.HUB_API_KEY });
  return list.filter((e) => e.key);
}

// 어떤 키인지 이름을 돌려준다. 맞는 키가 없으면 null. (admin = 관리 키)
export function keyOwner(given) {
  if (!given) return null;
  if (process.env.NOTIFY_SECRET && same(given, process.env.NOTIFY_SECRET)) return "admin";
  for (const e of hubKeys()) if (same(given, e.key)) return e.name;
  return null;
}

// 보내기·일정 등록·상태 확인용 키: 관리 키(NOTIFY_SECRET) 또는 AI용 키
export function keyIsValid(given) {
  return keyOwner(given) !== null;
}

// 카카오 로그인을 다시 시작하는 일은 관리 키(NOTIFY_SECRET)만 할 수 있다.
// (AI 서비스에 맡긴 HUB_API_KEY 가 새어도 내 카카오 계정이 바뀌지 않게 하려고 나눴다)
export function adminKeyIsValid(given) {
  const secret = process.env.NOTIFY_SECRET;
  if (!secret || !given) return false;
  return same(given, secret);
}

// 키를 받는 방법: 헤더 x-notify-key, 헤더 Authorization: Bearer <키>, 주소의 ?key=
export function keyFromRequest(request, searchParams) {
  const h = request.headers;
  const bearer = /^Bearer\s+(.+)$/i.exec(h.get("authorization") || "")?.[1];
  return h.get("x-notify-key") || bearer || searchParams?.get("key") || null;
}
