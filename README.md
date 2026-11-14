# 카카오톡 나에게 보내기 + 네이버 일정 (Next.js, AI 공용 입구)

한 번만 카카오 인증을 해 두면, 이후에는 주소 하나로 내 카카오톡(나와의 채팅)에 메시지를 보낼 수 있는 중계 앱입니다.
클라우드 예약 작업처럼 카카오 서버에 직접 접속하지 못하는 곳에서도 이 앱을 거쳐 보낼 수 있습니다.

## AI 공용 입구 (ChatGPT · Gemini · Claude 모두 사용)

같은 서버가 AI 도구 연결 주소 2개를 엽니다. 키는 **AI용 키(`HUB_API_KEY`)** 를 따로 만들어 쓰세요. 새어도 카카오 재인증은 못 합니다(재인증은 관리 키 `NOTIFY_SECRET` 만 가능).

| 주소 | 대상 | 설명 |
|---|---|---|
| `/api/mcp` | Claude, Gemini CLI, ChatGPT 커넥터 | MCP(Streamable HTTP). 도구 3개: `send_kakao_message`, `create_naver_calendar_event`, `check_connection_status` |
| `/api/openapi` | ChatGPT 맞춤 GPT(Actions) | OpenAPI 3.1 설명서. 인증은 헤더 `x-notify-key` |
| `/api/calendar` | 직접 호출 | 네이버 캘린더 일정 등록 (`title`, `description`, `start`, `duration_minutes`) |
| `/api/hub-status` | 직접 호출 | 카카오·네이버 연결 상태 (토큰 값은 안 나옴) |

키는 헤더 `x-notify-key`, `Authorization: Bearer 키`, 주소 `?key=` 중 아무거나 됩니다.

### 구조

```
AI (ChatGPT / Gemini / Claude)
   └─ kakao-message-app  (이 앱)  ── 카카오 토큰: Vercel Blob 에 보관·자동 갱신
         └─ naver-blog-planner (네이버 일정 앱) ── 네이버 열쇠: Vercel Blob 에 보관·자동 갱신
```

- 네이버 앱 설정값(Client ID/Secret)과 로그인은 naver-blog-planner 에 두었습니다. 이 앱은 `NAVER_PLANNER_URL`, `NAVER_LOG_KEY` 로 거기에 전달만 합니다.
- 두 앱의 Vercel "Vercel Authentication"(로그인 보호)은 꺼야 AI 서비스가 접속할 수 있습니다. 대신 모든 호출에 키가 필요합니다.

### 추가 환경변수

`HUB_API_KEY`(AI용 키), `NAVER_PLANNER_URL`(예: https://naver-blog-planner.vercel.app), `NAVER_LOG_KEY`(naver-blog-planner 의 `LOG_KEY` 와 같은 값)

## 동작 방식

1. **최초 인증 (1번만)**: 첫 화면에서 관리 키를 넣고 "카카오로 최초 인증하기" → 카카오 로그인·동의 → 토큰이 비공개 저장소(Vercel Blob)에 저장됩니다.
2. **계속 사용**: `/api/notify` 를 부르면 저장된 토큰으로 보냅니다. 액세스 토큰(약 6시간)이 끝났으면 리프레시 토큰으로 자동 갱신하고, 새 리프레시 토큰이 오면 다시 저장합니다.
3. 리프레시 토큰은 약 60일 유효합니다. 카카오가 갱신 때 새 토큰을 주면 자동으로 늘어나므로 가끔이라도 쓰면 계속 유지됩니다. 60일 이상 한 번도 안 쓰면 다시 최초 인증이 필요합니다.

## 보내기 주소

| 방식 | 사용법 |
|---|---|
| 주소로 | `GET /api/notify?key=관리키&text=내용` (선택 `&link=https://...`) |
| 본문으로 | `POST /api/notify` + 헤더 `x-notify-key: 관리키` + JSON `{ "text": "내용", "link": "https://..." }` |

- 카카오톡 말풍선에는 200자까지 들어가고, 더 길면 줄여서 보냅니다. **"자세히 보기"를 누르면 보낸 내용 전체가 나오는 상세 화면(`/m/<난수>`)이 열립니다.**
- 상세 화면에 요약과 다른 긴 내용을 보여 주려면 `&detail=긴내용`(최대 20000자)을 붙입니다. 일반 글은 줄바꿈 그대로 보이고, HTML 을 넣으면 안전한 태그만 남겨 보여 줍니다(p, br, b, i, h1~h4, ul/ol/li, a, img(https만), table, pre, blockquote 등. script·이벤트·iframe 은 제거). HTML 이 길면 POST(`{"text","detail"}`)로 보내세요. `&link=`를 주면 상세 화면 대신 그 링크가 열립니다. 카카오는 등록한 도메인만 정상으로 열어 주므로 링크도 이 앱의 `/m/<난수>`를 한 번 거치고, 카카오톡 안에서는 외부 브라우저(크롬·엣지 등)로 넘어갑니다.
- 카톡 카드(이미지+제목+설명)로 보내려면 `&image=https://공개이미지주소`(필수, https)와 `&title=제목`, `&desc=설명`을 붙입니다. 카드에도 **자세히 보기** 버튼이 붙습니다. `&link=https://페이지`만 주면 그 페이지의 대표 이미지·제목·설명을 자동으로 가져와 카드로 만듭니다(유튜브 링크처럼). 이미지가 없으면 글 말풍선으로 갑니다. 이미지는 Vercel 로그인 보호 때문에 이 앱 주소가 아닌 누구나 볼 수 있는 주소여야 합니다.
- 성공 `{"ok":true}`, 실패 `{"ok":false,"error":"...","needsAuth":true/false}`. `needsAuth` 가 true 면 최초 인증을 다시 해야 합니다.

## 환경변수

`.env.example` 참고. `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`, `NOTIFY_SECRET` 4개를 Vercel 프로젝트 환경변수에 넣고, Blob 저장소를 프로젝트에 연결하면 `BLOB_READ_WRITE_TOKEN` 이 자동으로 들어옵니다.

## 카카오 콘솔 설정

- 카카오 로그인 사용 설정 ON
- 앱 > 플랫폼 키 > REST API 키 > 카카오 로그인 리다이렉트 URI 에 `https://배포주소/api/auth/callback` 등록
- 카카오 로그인 > 동의항목 > 카카오톡 메시지 전송 (선택 동의)
- 앱 > 제품 링크 관리 에 배포 주소 등록 (메시지 링크용)

## 구조

- `app/page.js` : 상태 확인, 최초 인증 시작, 테스트 전송
- `app/api/auth/login|callback|status` : 최초 인증과 상태 확인
- `app/m/[id]/page.js` : "자세히 보기" 상세 화면
- `lib/messages.js` : 보낸 메시지 전문 저장(Blob)
- `app/api/notify/route.js` : 보내기 주소
- `lib/kakao.js` : 토큰 발급·갱신, 전송
- `lib/store.js` : 토큰 저장소 (Blob, 테스트용 파일)
- `lib/guard.js` : 키 확인 (관리 키 / AI용 키 구분)
- `lib/notify.js` : 보내기 공통 처리 (주소와 MCP 가 함께 사용)
- `lib/tools.js`, `app/api/mcp`, `app/api/openapi` : AI 도구 정의와 연결 주소
- `lib/naver-proxy.js`, `app/api/calendar`, `app/api/hub-status` : 네이버 일정 전달, 상태 확인

## 보안 메모

- 토큰 값은 화면·응답에 나오지 않습니다. 저장소는 비공개입니다.
- 관리 키가 있어야 인증을 시작하거나 보낼 수 있습니다. 주소에 키가 들어가는 방식(GET)은 접속 기록에 남을 수 있으니, 노출됐다고 생각되면 `NOTIFY_SECRET` 을 바꾸세요.

## 내 컴퓨터에서 실행

`.env.example` 을 `.env.local` 로 복사해 값을 채우고, 토큰을 파일로 쓰려면 `TOKEN_STORE_DIR=./.tokens` 를 추가합니다. `npm install` → `npm run dev`.
