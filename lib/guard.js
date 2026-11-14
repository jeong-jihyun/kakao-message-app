import crypto from "node:crypto";

// 길이가 달라도 같은 시간이 걸리도록 해시해서 비교한다.
function same(given, secret) {
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(String(secret)).digest();
  return crypto.timingSafeEqual(a, b);
}

// 보내기·일정 등록·상태 확인용 키: 관리 키(NOTIFY_SECRET) 또는 AI용 키(HUB_API_KEY)
export function keyIsValid(given) {
  if (!given) return false;
  return [process.env.NOTIFY_SECRET, process.env.HUB_API_KEY]
    .filter(Boolean)
    .some((secret) => same(given, secret));
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
