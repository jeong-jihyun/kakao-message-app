// AI용 키 발급·폐기·목록 (관리 키 필요)
//   ?action=create&name=chatgpt   새 키 발급 (키 원문은 이 응답에서 한 번만 보임)
//   ?action=revoke&name=chatgpt   키 폐기
//   ?action=list                  이름·발급일·상태 목록 (키 원문은 없음)
import { NextResponse } from "next/server";
import { adminKeyIsValid, keyFromRequest } from "../../../../lib/guard.js";
import { createKey, revokeKey, listKeys } from "../../../../lib/keystore.js";

export const dynamic = "force-dynamic";
const json = (b, s = 200) => NextResponse.json(b, { status: s, headers: { "cache-control": "no-store" } });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (!adminKeyIsValid(keyFromRequest(request, searchParams))) return json({ ok: false, error: "관리 키가 맞지 않습니다." }, 401);
  const action = searchParams.get("action") || "list";
  try {
    if (action === "create") return json({ ok: true, ...(await createKey(searchParams.get("name"))) });
    if (action === "revoke") {
      const n = await revokeKey(searchParams.get("name"));
      return json({ ok: n > 0, revoked: n });
    }
    return json({ ok: true, keys: await listKeys() });
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 400);
  }
}
