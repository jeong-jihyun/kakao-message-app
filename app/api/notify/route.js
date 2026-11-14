import { NextResponse } from "next/server";
import { keyIsValid, keyFromRequest } from "../../../lib/guard.js";
import { deliver, baseUrl } from "../../../lib/notify.js";

export const dynamic = "force-dynamic";

function fail(status, error, extra = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

async function handle(request, { key, ...fields }) {
  if (!process.env.NOTIFY_SECRET) return fail(500, "서버에 NOTIFY_SECRET 환경변수가 없습니다.");
  if (!await keyIsValid(key)) return fail(401, "관리 키가 맞지 않습니다.");
  const { status, body } = await deliver({ base: baseUrl(request.url), ...fields });
  return NextResponse.json(body, { status });
}

// 주소로 보내기: /api/notify?key=관리키&text=내용 (선택: &detail=자세히 보기에 보여 줄 긴 내용, &link=직접 지정한 링크)  (예약 작업·스킬에서 쓰기 쉬운 방식)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  return handle(request, {
    key: keyFromRequest(request, searchParams),
    text: searchParams.get("text"),
    link: searchParams.get("link"),
    detail: searchParams.get("detail"),
    title: searchParams.get("title"),
    desc: searchParams.get("desc"),
    image: searchParams.get("image"),
  });
}

// 본문으로 보내기: 헤더 x-notify-key(또는 Authorization: Bearer) + JSON { text, link, detail }
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {}
  return handle(request, {
    key: keyFromRequest(request) || body.key,
    text: body.text,
    link: body.link,
    detail: body.detail,
    title: body.title,
    desc: body.desc,
    image: body.image,
  });
}
