// AI 도구 연결 주소 (MCP, Streamable HTTP, 상태 없는 JSON 응답)
// Claude · Gemini CLI · ChatGPT(커넥터) 등이 이 주소 하나로 카카오 보내기와 네이버 일정 등록을 쓴다.
import { NextResponse } from "next/server";
import { keyIsValid, keyFromRequest } from "../../../lib/guard.js";
import { TOOLS, runTool } from "../../../lib/tools.js";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-notify-key, mcp-session-id, mcp-protocol-version",
};

const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handleMessage(msg, ctx) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg?.id, -32600, "Invalid Request");
  }
  const isNotification = msg.id === undefined || msg.id === null;
  if (isNotification) return null; // notifications/initialized 등은 응답하지 않는다

  switch (msg.method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: msg.params?.protocolVersion || "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "notify-hub", version: "1.0.0" },
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id: msg.id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0", id: msg.id, result: { tools: TOOLS } };
    case "tools/call": {
      const name = msg.params?.name;
      if (!TOOLS.some((t) => t.name === name)) {
        return rpcError(msg.id, -32602, `알 수 없는 도구: ${name}`);
      }
      const { status, body } = await runTool(name, msg.params?.arguments, ctx);
      const ok = status >= 200 && status < 300 && body?.ok !== false;
      return {
        jsonrpc: "2.0",
        id: msg.id,
        result: { content: [{ type: "text", text: JSON.stringify(body) }], isError: !ok },
      };
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(request) {
  const { searchParams, origin } = new URL(request.url);
  if (!keyIsValid(keyFromRequest(request, searchParams))) {
    return NextResponse.json(rpcError(null, -32001, "키가 맞지 않습니다."), {
      status: 401,
      headers: { ...CORS, "WWW-Authenticate": 'Bearer realm="notify-hub"' },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400, headers: CORS });
  }

  const ctx = { base: process.env.KAKAO_REDIRECT_URI ? new URL(process.env.KAKAO_REDIRECT_URI).origin : origin };
  const batch = Array.isArray(payload);
  const replies = [];
  for (const m of batch ? payload : [payload]) {
    const r = await handleMessage(m, ctx);
    if (r) replies.push(r);
  }
  if (replies.length === 0) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(batch ? replies : replies[0], { headers: CORS });
}

// 이 서버는 서버가 먼저 보내는 스트림을 쓰지 않는다
export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
