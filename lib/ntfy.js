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
  // 알림을 누르면 카카오톡 앱이 열리게 한다. (NTFY_CLICK 환경변수로 주소를 바꿀 수 있음)
  body.click = process.env.NTFY_CLICK || "kakaotalk://launch";
  // 전문은 버튼으로 따로 연다.
  if (link) body.actions = [{ action: "view", label: "자세히 보기", url: link }];
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
