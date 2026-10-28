import crypto from "node:crypto";

// 관리 키(NOTIFY_SECRET) 확인. 길이가 달라도 같은 시간이 걸리도록 해시해서 비교한다.
export function keyIsValid(given) {
  const secret = process.env.NOTIFY_SECRET;
  if (!secret || !given) return false;
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}
