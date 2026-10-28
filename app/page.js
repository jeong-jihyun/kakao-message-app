"use client";

import { useEffect, useState } from "react";

const box = {
  maxWidth: 480,
  margin: "40px auto",
  background: "#fff",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
};
const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 15,
  marginTop: 6,
};
const yellowBtn = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
  background: "#FEE500",
  color: "#191919",
  border: "none",
  borderRadius: 8,
  padding: 14,
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 16,
};
const grayBtn = { ...yellowBtn, background: "#eee", fontWeight: 600 };

export default function Home() {
  const [info, setInfo] = useState(null);
  const [key, setKey] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ authorized: false, error: "상태를 불러오지 못했습니다." }));
    const p = new URLSearchParams(window.location.search);
    if (p.get("error")) setStatus("❌ 인증 오류: " + p.get("error"));
    if (p.get("authorized")) setStatus("✅ 최초 인증이 끝났습니다. 이제 계속 사용할 수 있어요.");
  }, []);

  function startAuth() {
    if (!key.trim()) {
      setStatus("관리 키를 먼저 입력해 주세요.");
      return;
    }
    window.location.href = "/api/auth/login?key=" + encodeURIComponent(key.trim());
  }

  async function testSend() {
    if (!key.trim() || !text.trim()) {
      setStatus("관리 키와 보낼 내용을 모두 입력해 주세요.");
      return;
    }
    setStatus("보내는 중...");
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-key": key.trim() },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setStatus(
      data.ok
        ? "✅ 보냈어요. 카카오톡 '나와의 채팅'을 확인해 보세요."
        : "❌ 실패: " + (data.error || "알 수 없는 오류") + (data.needsAuth ? " → 위에서 인증을 다시 하세요." : "")
    );
  }

  const done = info?.authorized;

  return (
    <main style={box}>
      <h1 style={{ marginTop: 0, fontSize: 22 }}>💬 카카오톡 나에게 보내기</h1>

      {info === null && <p>확인 중...</p>}
      {info && (
        <p style={{ color: done ? "#1a7f37" : "#b35900" }}>
          {done
            ? "인증 상태: 완료 (토큰은 자동으로 갱신됩니다)"
            : "인증 상태: 아직 안 됨 — 아래에서 최초 인증을 해 주세요"}
          {info.error ? ` / ${info.error}` : ""}
        </p>
      )}

      <label style={{ display: "block", marginTop: 12 }}>
        관리 키
        <input
          type="password"
          style={input}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="NOTIFY_SECRET 값"
          autoComplete="off"
        />
      </label>

      <button style={yellowBtn} onClick={startAuth}>
        {done ? "카카오로 다시 인증하기" : "카카오로 최초 인증하기"}
      </button>

      {done && (
        <>
          <label style={{ display: "block", marginTop: 22 }}>
            테스트로 보낼 내용
            <textarea
              rows={3}
              style={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예) 테스트 메시지입니다"
            />
          </label>
          <button style={grayBtn} onClick={testSend}>
            나에게 테스트 보내기
          </button>
        </>
      )}

      {status && <p style={{ marginTop: 18 }}>{status}</p>}
    </main>
  );
}
