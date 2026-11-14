// ChatGPT 맞춤 GPT(Actions)용 API 설명서 (OpenAPI 3.1). 주소: /api/openapi
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request) {
  const { origin } = new URL(request.url);
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Notify Hub",
      version: "1.0.0",
      description: "사용자 본인의 카카오톡 나와의 채팅 보내기, 네이버 캘린더 일정 등록.",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/notify": {
        post: {
          operationId: "sendKakaoMessage",
          summary: "카카오톡 나에게 보내기",
          description:
            "사용자 본인의 카카오톡 나와의 채팅으로 메시지를 보낸다. 작업 결과 알림용. 비밀번호·키는 넣지 않는다.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text"],
                  properties: {
                    text: { type: "string", description: "말풍선에 보일 요약, 200자 이내" },
                    detail: { type: "string", description: "자세히 보기 화면의 긴 내용 (선택)" },
                    link: { type: "string", description: "https 링크 (선택)" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "보냄",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" }, truncated: { type: "boolean" } },
                  },
                },
              },
            },
            409: { description: "카카오 재인증 필요 (needsAuth)" },
          },
        },
      },
      "/api/calendar": {
        post: {
          operationId: "createNaverCalendarEvent",
          summary: "네이버 캘린더에 일정 등록",
          description:
            "사용자 본인의 네이버 캘린더에 일정 1건을 등록한다. 시각은 한국 시간이고 생략하면 지금이다.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title"],
                  properties: {
                    title: { type: "string", description: "일정 제목, 100자 이내" },
                    description: { type: "string", description: "설명 (선택), 500자 이내" },
                    start: { type: "string", description: "시작 시각 YYYY-MM-DDTHH:mm 한국 시간 (선택)" },
                    duration_minutes: { type: "integer", description: "길이(분) 5~240 (선택, 기본 15)" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "등록됨",
              content: {
                "application/json": {
                  schema: { type: "object", properties: { ok: { type: "boolean" }, title: { type: "string" } } },
                },
              },
            },
            409: { description: "네이버 재연결 필요 (needsAuth)" },
          },
        },
      },
      "/api/hub-status": {
        get: {
          operationId: "checkConnectionStatus",
          summary: "카카오·네이버 연결 상태 확인",
          description: "보내기나 등록이 실패했을 때 원인을 확인한다.",
          responses: {
            200: {
              description: "상태",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "x-notify-key" },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  };
  return NextResponse.json(spec, { headers: { "Access-Control-Allow-Origin": "*" } });
}
