// 링크 미리보기 정보(제목·설명·대표 이미지)를 가져온다. 카카오톡 카드(이미지+제목+설명)용.
// - https 주소만, 내 서버 안쪽 주소(localhost, 사설 IP)는 막는다.
// - 4초 안에 못 받으면 포기하고, 앞부분 256KB 만 읽는다.

const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:)/i;

export function isPublicHttps(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && !PRIVATE_HOST.test(x.hostname) && !x.username && !x.password;
  } catch {
    return false;
  }
}

function decode(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

function meta(html, names) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`,
      "i"
    );
    const tag = html.match(re)?.[0];
    if (!tag) continue;
    const c = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (c) return decode(c);
  }
  return "";
}

export async function fetchPreview(url) {
  if (!isPublicHttps(url)) return null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; KakaoMessageBot/1.0)", accept: "text/html" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const reader = res.body.getReader();
    let got = 0;
    const chunks = [];
    while (got < 256 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
    }
    try {
      await reader.cancel();
    } catch {}
    const html = Buffer.concat(chunks).toString("utf8");
    const title =
      meta(html, ["og:title", "twitter:title"]) || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]);
    const description = meta(html, ["og:description", "twitter:description", "description"]);
    let image = meta(html, ["og:image", "og:image:url", "twitter:image"]);
    if (image) {
      try {
        image = new URL(image, res.url || url).toString();
      } catch {
        image = "";
      }
    }
    if (!isPublicHttps(image)) image = "";
    return { title, description, image };
  } catch {
    return null;
  }
}
