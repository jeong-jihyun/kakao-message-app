// AI용 키 장부: 키 원문은 저장하지 않고 sha256 해시만 저장한다.
// - 배포(Vercel): 비공개 Blob (hub/keys.json)
// - 내 컴퓨터 테스트: TOKEN_STORE_DIR 폴더의 keys.json
import { put, get } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const BLOB_NAME = "hub/keys.json";

function kind() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.TOKEN_STORE_DIR) return "file";
  return "none";
}

export const hashKey = (k) => crypto.createHash("sha256").update(String(k)).digest("hex");

export async function loadKeys() {
  try {
    if (kind() === "file") {
      return JSON.parse(await fs.readFile(path.join(process.env.TOKEN_STORE_DIR, "keys.json"), "utf8"));
    }
    if (kind() === "blob") {
      const r = await get(BLOB_NAME, { access: "private", useCache: false });
      if (!r || !r.stream) return [];
      const text = await new Response(r.stream).text();
      return text ? JSON.parse(text) : [];
    }
  } catch {
    return [];
  }
  return [];
}

async function saveKeys(list) {
  const body = JSON.stringify(list);
  if (kind() === "file") {
    await fs.mkdir(process.env.TOKEN_STORE_DIR, { recursive: true });
    await fs.writeFile(path.join(process.env.TOKEN_STORE_DIR, "keys.json"), body, { mode: 0o600 });
    return;
  }
  if (kind() === "blob") {
    await put(BLOB_NAME, body, {
      access: "private", allowOverwrite: true, addRandomSuffix: false,
      contentType: "application/json", cacheControlMaxAge: 0,
    });
    return;
  }
  throw new Error("저장소가 연결되지 않았습니다 (BLOB_READ_WRITE_TOKEN 없음)");
}

// 새 키 발급: 같은 이름이 이미 쓰이면 거절한다. 키 원문은 이 반환값으로 한 번만 나간다.
export async function createKey(name) {
  const clean = String(name || "").trim().slice(0, 40);
  if (!/^[\w.\-가-힣]+$/.test(clean)) throw new Error("이름은 글자·숫자·-·_ 만 쓸 수 있습니다.");
  const list = await loadKeys();
  if (list.some((e) => e.name === clean && !e.revoked)) throw new Error("이미 쓰는 이름입니다.");
  const key = crypto.randomBytes(32).toString("base64url");
  list.push({ name: clean, hash: hashKey(key), created: new Date().toISOString(), revoked: false });
  await saveKeys(list);
  return { name: clean, key };
}

export async function revokeKey(name) {
  const list = await loadKeys();
  let n = 0;
  for (const e of list) if (e.name === name && !e.revoked) { e.revoked = true; e.revokedAt = new Date().toISOString(); n++; }
  if (n) await saveKeys(list);
  return n;
}

export async function listKeys() {
  return (await loadKeys()).map(({ name, created, revoked, revokedAt }) => ({ name, created, revoked, revokedAt }));
}
