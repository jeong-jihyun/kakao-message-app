import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// "나에게 보내기" 카카오톡 메시지 API 호출
export async function POST(request) {
  const token = cookies().get("kakao_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { text, link } = await request.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "내용이 비어 있어요." }, { status: 400 });
  }

  const webUrl = link && /^https?:\/\//.test(link) ? link : "https://www.kakaocorp.com";

  const template = {
    object_type: "text",
    text: text.slice(0, 200), // 텍스트 템플릿은 최대 200자
    link: { web_url: webUrl, mobile_web_url: webUrl },
    button_title: "열어보기",
  };

  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }),
  });
  const data = await res.json();

  if (!res.ok) {
    const expired = res.status === 401;
    return NextResponse.json(
      { error: expired ? "로그인이 만료됐어요. 다시 로그인해 주세요." : data.msg || "전송 실패" },
      { status: expired ? 401 : 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
