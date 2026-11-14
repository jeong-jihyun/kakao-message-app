import { NextResponse } from "next/server";
import { keyIsValid, keyFromRequest } from "../../../lib/guard.js";
import { createNaverEvent } from "../../../lib/naver-proxy.js";

export const dynamic = "force-dynamic";

async function handle(key, f) {
  if (!process.env.NOTIFY_SECRET) {
    return NextResponse.json({ ok: false, error: "서버에 NOTIFY_SECRET 환경변수가 없습니다." }, { status: 500 });
  }
  if (!await keyIsValid(key)) {
    return NextResponse.json({ ok: false, error: "관리 키가 맞지 않습니다." }, { status: 401 });
  }
  const { status, body } = await createNaverEvent({
    title: f.title,
    desc: f.description ?? f.desc,
    at: f.start ?? f.at,
    min: f.duration_minutes ?? f.min,
  });
  return NextResponse.json(body, { status });
}

// 주소로: /api/calendar?key=키&title=제목&desc=설명&at=YYYY-MM-DDTHH:mm&min=15
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  return handle(keyFromRequest(request, searchParams), Object.fromEntries(searchParams));
}

// 본문으로: 헤더 x-notify-key(또는 Authorization: Bearer) + JSON { title, description, start, duration_minutes }
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {}
  return handle(keyFromRequest(request) || body.key, body);
}
