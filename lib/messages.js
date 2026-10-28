// 보낸 메시지 전문 저장소 ("자세히 보기"에서 보여 줄 내용)
// - 배포(Vercel): 비공개 Blob (kakao/messages/<id>.json)
// - 내 컴퓨터 테스트: TOKEN_STORE_DIR/messages/<id>.json
import { put, get } from "@vercel/blob";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { storageKind } from "./store.js";

export const MAX_DETAIL = 3000;
const ID_RE = /^[A-Za-z0-9_-]{16}$/;

export function isValidId(id) {
  return typeof id === "string" && ID_RE.test(id);
}

// 12바이트 난수 → 16자. 추측할 수 없는 주소를 만든다.
function newId() {
  return crypto.randomBytes(12).toString("base64url");
}

export async function saveMessage({ text, detail }) {
  const id = newId();
  const body = JSON.stringify({
    text: String(text),
    detail: String(detail ?? text).slice(0, MAX_DETAIL),
    createdAt: Date.now(),
  });
  const kind = storageKind();
  if (kind === "file") {
    const dir = path.join(process.env.TOKEN_STORE_DIR, "messages");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${id}.json`), body, { mode: 0o600 });
    return id;
  }
  if (kind === "blob") {
    await put(`kakao/messages/${id}.json`, body, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return id;
  }
  throw new Error("저장소가 연결되지 않았습니다");
}

export async function loadMessage(id) {
  if (!isValidId(id)) return null;
  const kind = storageKind();
  try {
    if (kind === "file") {
      return JSON.parse(
        await fs.readFile(path.join(process.env.TOKEN_STORE_DIR, "messages", `${id}.json`), "utf8")
      );
    }
    if (kind === "blob") {
      const r = await get(`kakao/messages/${id}.json`, { access: "private", useCache: false });
      if (!r || !r.stream) return null;
      const t = await new Response(r.stream).text();
      return t ? JSON.parse(t) : null;
    }
  } catch {
    return null;
  }
  return null;
}
