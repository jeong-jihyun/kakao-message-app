// 폰 푸시 알림(ntfy). 카카오 '나에게 보내기'는 알림이 울리지 않아서 같이 보낸다.
// 환경변수 NTFY_TOPIC 이 없으면 아무것도 하지 않는다. (NTFY_SERVER 로 서버 변경 가능)
export async function pushToPhone({ text, link }) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return { skipped: true };
  const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
  const lines = String(text || "").split("\n");
  const body = {
    topic,
    title: lines[0].slice(0, 100) || "알림",
    message: String(text || "").slice(0, 1000),
    priority: 4,
  };
  if (link) body.click = link;
  try {
    const res = await fetch(server, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
