import { loadMessage } from "../../../lib/messages.js";
import { isHtml, sanitizeDetail } from "../../../lib/render.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "받은 메시지",
  robots: { index: false, follow: false },
};

function when(ms) {
  try {
    return new Date(ms).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
  } catch {
    return "";
  }
}

export default async function MessagePage({ params }) {
  const { id } = await params;
  const m = await loadMessage(id);

  const card = {
    maxWidth: 560,
    margin: "40px auto",
    padding: 24,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,.08)",
  };

  if (!m) {
    return (
      <main style={card}>
        <h1 style={{ fontSize: 20, margin: "0 0 12px" }}>💬 메시지를 찾을 수 없어요</h1>
        <p style={{ color: "#666", margin: 0 }}>
          주소가 틀렸거나 이미 지워진 메시지입니다.
        </p>
      </main>
    );
  }

  return (
    <main style={card}>
      <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>💬 받은 메시지</h1>
      <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>{when(m.createdAt)}</p>
      {isHtml(m.detail) ? (
        <div
          className="msg-body"
          style={{ wordBreak: "break-word", lineHeight: 1.7, fontSize: 16 }}
          dangerouslySetInnerHTML={{ __html: sanitizeDetail(m.detail) }}
        />
      ) : (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.7, fontSize: 16 }}>
          {m.detail}
        </div>
      )}
      <style>{`.msg-body img{max-width:100%;height:auto;border-radius:8px}.msg-body table{border-collapse:collapse;max-width:100%}.msg-body th,.msg-body td{border:1px solid #ddd;padding:6px 10px}.msg-body pre{white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px}.msg-body blockquote{margin:8px 0;padding-left:12px;border-left:3px solid #ddd;color:#555}`}</style>
    </main>
  );
}
