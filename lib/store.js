// 카카오 토큰 저장소
// - 배포(Vercel): 비공개 Blob 저장소 (BLOB_READ_WRITE_TOKEN 이 자동으로 들어옴)
// - 내 컴퓨터 테스트: TOKEN_STORE_DIR 폴더에 파일로 저장
import { put, get } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

const BLOB_NAME = "kakao/tokens.json";

export function storageKind() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.TOKEN_STORE_DIR) return "file";
  return "none";
}

export async function loadTokens() {
  const kind = storageKind();
  if (kind === "file") {
    try {
      return JSON.parse(
        await fs.readFile(path.join(process.env.TOKEN_STORE_DIR, "tokens.json"), "utf8")
      );
    } catch {
      return null;
    }
  }
  if (kind === "blob") {
    const r = await get(BLOB_NAME, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    const text = await new Response(r.stream).text();
    return text ? JSON.parse(text) : null;
  }
  throw new Error("토큰 저장소가 연결되지 않았습니다 (BLOB_READ_WRITE_TOKEN 없음)");
}

export async function saveTokens(tokens) {
  const body = JSON.stringify(tokens);
  const kind = storageKind();
  if (kind === "file") {
    await fs.mkdir(process.env.TOKEN_STORE_DIR, { recursive: true });
    await fs.writeFile(path.join(process.env.TOKEN_STORE_DIR, "tokens.json"), body, {
      mode: 0o600,
    });
    return;
  }
  if (kind === "blob") {
    await put(BLOB_NAME, body, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return;
  }
  throw new Error("토큰 저장소가 연결되지 않았습니다 (BLOB_READ_WRITE_TOKEN 없음)");
}
