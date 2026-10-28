import { NextResponse } from "next/server";
import { authStatus } from "../../../../lib/kakao.js";
import { storageKind } from "../../../../lib/store.js";

export const dynamic = "force-dynamic";

// 인증이 끝났는지만 알려준다 (토큰 값은 절대 내보내지 않음)
export async function GET() {
  const storage = storageKind();
  if (storage === "none") {
    return NextResponse.json({ authorized: false, storage, error: "토큰 저장소가 연결되지 않았습니다." });
  }
  try {
    return NextResponse.json({ ...(await authStatus()), storage });
  } catch (e) {
    return NextResponse.json({ authorized: false, storage, error: e.message }, { status: 500 });
  }
}
