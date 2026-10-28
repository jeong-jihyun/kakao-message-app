// 상세 화면용 본문 변환
// - 태그가 없는 일반 글: 줄바꿈을 그대로 살려 보여 줌
// - HTML 이 섞인 글: 허용한 태그만 남기고 나머지는 제거(스크립트·이벤트·위험 주소 차단)
import sanitizeHtml from "sanitize-html";

const HAS_TAG = /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i;

export function isHtml(s) {
  return HAS_TAG.test(String(s || ""));
}

const OPTIONS = {
  allowedTags: [
    "p", "br", "hr", "div", "span", "b", "strong", "i", "em", "u", "s", "mark", "small",
    "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "code",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "width", "height", "title"],
    "*": ["style"],
  },
  // 이미지는 https 만, 링크는 http/https/mailto/tel 만
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  allowedStyles: {
    "*": {
      color: [/^#[0-9a-f]{3,8}$/i, /^[a-z]+$/i],
      "background-color": [/^#[0-9a-f]{3,8}$/i, /^[a-z]+$/i],
      "text-align": [/^(left|right|center)$/],
      "font-size": [/^\d{1,3}(px|em|rem|%)$/],
      "font-weight": [/^(normal|bold|\d{3})$/],
    },
  },
  transformTags: {
    a: (tag, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
    }),
    img: (tag, attribs) => ({
      tagName: "img",
      attribs: { ...attribs, loading: "lazy", referrerpolicy: "no-referrer" },
    }),
  },
};

// target/rel/loading/referrerpolicy 는 우리가 직접 붙이므로 허용 목록에 추가
OPTIONS.allowedAttributes.a.push("target", "rel");
OPTIONS.allowedAttributes.img.push("loading", "referrerpolicy");

export function sanitizeDetail(s) {
  return sanitizeHtml(String(s || ""), OPTIONS);
}
