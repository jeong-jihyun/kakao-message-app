// 네이버 캘린더 일정 등록은 naver-blog-planner 앱이 맡는다.
// (네이버 앱 설정값과 로그인 열쇠가 그 앱에 있고, 열쇠는 그 앱이 자동으로 보관·갱신한다)
// 이 앱은 AI(ChatGPT·Gemini·Claude)가 부르는 공용 입구로서 그 앱에 전달만 한다.

function cfg() {
  const base = (process.env.NAVER_PLANNER_URL || "").replace(/\/+$/, "");
  const key = process.env.NAVER_LOG_KEY || "";
  return base && key ? { base, key } : null;
}

const notConfigured = {
  status: 503,
  body: { ok: false, error: "NAVER_PLANNER_URL / NAVER_LOG_KEY 환경변수가 없습니다." },
};

async function call(path, init) {
  const c = cfg();
  if (!c) return notConfigured;
  try {
    const res = await fetch(`${c.base}${path}`, {
      ...init,
      headers: { "x-log-key": c.key, "content-type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = { ok: false, error: `네이버 일정 앱이 JSON 이 아닌 응답을 줬습니다 (HTTP ${res.status})` };
    }
    return { status: res.status, body };
  } catch (e) {
    return { status: 502, body: { ok: false, error: `네이버 일정 앱에 연결하지 못했습니다: ${e.message}` } };
  }
}

// title(필수), desc, at(YYYY-MM-DDTHH:mm 한국 시각, 생략하면 지금), min(분, 5~240)
export function createNaverEvent({ title, desc, at, min }) {
  if (!String(title || "").trim()) {
    return Promise.resolve({ status: 400, body: { ok: false, error: "title(일정 제목)이 필요합니다." } });
  }
  return call("/api/log", {
    method: "POST",
    body: JSON.stringify({ title, desc, at, min }),
  });
}

export async function naverConnection() {
  const r = await call("/api/log/status", { method: "GET" });
  return r.body;
}
