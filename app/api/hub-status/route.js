import { NextResponse } from "next/server";
import { keyIsValid, keyFromRequest } from "../../../lib/guard.js";
import { runTool } from "../../../lib/tools.js";

export const dynamic = "force-dynamic";

// 카카오·네이버 연결 상태 (토큰 값은 내보내지 않음). 키가 맞아야 한다.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  if (!keyIsValid(keyFromRequest(request, searchParams))) {
    return NextResponse.json({ ok: false, error: "관리 키가 맞지 않습니다." }, { status: 401 });
  }
  const { status, body } = await runTool("check_connection_status", {}, { base: origin });
  return NextResponse.json(body, { status });
}
