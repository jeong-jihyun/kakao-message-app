// AI 도구 정의 (MCP 와 OpenAPI 가 같은 내용을 쓴다)
import { deliver } from "./notify.js";
import { createNaverEvent, naverConnection } from "./naver-proxy.js";
import { authStatus } from "./kakao.js";
import { storageKind } from "./store.js";

export const TOOLS = [
  {
    name: "send_kakao_message",
    description:
      "사용자 본인의 카카오톡 '나와의 채팅'으로 메시지를 보낸다. 작업이 끝났을 때 결과 알림 등에 쓴다. " +
      "말풍선에는 200자까지 보이고, 더 긴 내용은 detail 에 넣으면 '자세히 보기' 화면에 나온다. " +
      "비밀번호·키·토큰은 절대 넣지 않는다.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "말풍선에 보일 요약 (200자 이내, 한국어로 짧게)" },
        detail: { type: "string", description: "자세히 보기 화면에 보여 줄 긴 내용 (선택, 최대 20000자)" },
        link: { type: "string", description: "누르면 열릴 https 링크 (선택)" },
      },
      required: ["text"],
    },
  },
  {
    name: "create_naver_calendar_event",
    description:
      "사용자 본인의 네이버 캘린더(기본 캘린더)에 일정 1건을 등록한다. 한 일을 짧게 기록할 때 쓴다. " +
      "시각은 한국 시간이며 생략하면 지금이다.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "일정 제목 (30자 안팎, 100자 이내)" },
        description: { type: "string", description: "설명 (선택, 500자 이내)" },
        start: { type: "string", description: "시작 시각 YYYY-MM-DDTHH:mm, 한국 시간 (선택, 생략하면 지금)" },
        duration_minutes: { type: "integer", description: "길이(분) 5~240 (선택, 기본 15)" },
      },
      required: ["title"],
    },
  },
  {
    name: "check_connection_status",
    description: "카카오·네이버 연결(로그인) 상태를 확인한다. 보내기·등록이 실패했을 때 원인 확인용.",
    inputSchema: { type: "object", properties: {} },
  },
];

async function statusBody() {
  let kakao;
  try {
    kakao =
      storageKind() === "none"
        ? { authorized: false, error: "토큰 저장소가 연결되지 않았습니다." }
        : await authStatus();
  } catch (e) {
    kakao = { authorized: false, error: e.message };
  }
  return { ok: true, kakao, naver: await naverConnection() };
}

// 도구 실행. 반환: { status, body }  (키 확인은 부르는 쪽에서 끝낸다)
export async function runTool(name, args, { base }) {
  const a = args && typeof args === "object" ? args : {};
  if (name === "send_kakao_message") {
    return deliver({ base, text: a.text, detail: a.detail, link: a.link });
  }
  if (name === "create_naver_calendar_event") {
    return createNaverEvent({
      title: a.title,
      desc: a.description ?? a.desc,
      at: a.start ?? a.at,
      min: a.duration_minutes ?? a.min,
    });
  }
  if (name === "check_connection_status") {
    return { status: 200, body: await statusBody() };
  }
  return { status: 404, body: { ok: false, error: `알 수 없는 도구: ${name}` } };
}
