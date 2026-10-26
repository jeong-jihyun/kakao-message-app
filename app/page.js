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
  textDecoration: "none",
  marginTop: 16,
};

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(null);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setLoggedIn(d.loggedIn))
      .catch(() => setLoggedIn(false));
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) setStatus("로그인 오류: " + err);
  }, []);

  async function send() {
    if (!text.trim()) {
      setStatus("보낼 내용을 입력해 주세요.");
      return;
    }
    setStatus("보내는 중...");
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, link }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("✅ 카카오톡으로 보냈어요! 나와의 채팅을 확인해 보세요.");
      setText("");
    } else {
      if (res.status === 401) setLoggedIn(false);
      setStatus("❌ 실패: " + (data.error || "알 수 없는 오류"));
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setLoggedIn(false);
    setStatus("");
  }

  return (
    <main style={box}>
      <h1 style={{ marginTop: 0, fontSize: 22 }}>💬 카카오톡 나에게 보내기</h1>

      {loggedIn === null && <p>확인 중...</p>}

      {loggedIn === false && (
        <>
          <p style={{ color: "#555" }}>
            카카오 계정으로 로그인하면 내 카카오톡으로 메시지를 보낼 수 있어요.
          </p>
          <a href="/api/auth/login" style={yellowBtn}>
            카카오로 로그인
          </a>
        </>
      )}

      {loggedIn === true && (
        <>
          <label>
            보낼 내용
            <textarea
              rows={4}
              style={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예) 오늘 할 일: 블로그 글 1개 올리기"
            />
          </label>
          <label style={{ display: "block", marginTop: 14 }}>
            눌렀을 때 열릴 링크 (선택)
            <input
              style={input}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <button style={yellowBtn} onClick={send}>
            나에게 카카오톡 보내기
          </button>
          <button
            onClick={logout}
            style={{
              marginTop: 12,
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </>
      )}

      {status && <p style={{ marginTop: 18 }}>{status}</p>}
    </main>
  );
}
