# 카카오톡 나에게 보내기 (Next.js, 중계 서버)

한 번만 카카오 인증을 해 두면, 이후에는 주소 하나로 내 카카오톡(나와의 채팅)에 메시지를 보낼 수 있는 중계 앱입니다.
클라우드 예약 작업처럼 카카오 서버에 직접 접속하지 못하는 곳에서도 이 앱을 거쳐 보낼 수 있습니다.

## 동작 방식

1. **최초 인증 (1번만)**: 첫 화면에서 관리 키를 넣고 "카카오로 최초 인증하기" → 카카오 로그인·동의 → 토큰이 비공개 저장소(Vercel Blob)에 저장됩니다.
2. **계속 사용**: `/api/notify` 를 부르면 저장된 토큰으로 보냅니다. 액세스 토큰(약 6시간)이 끝났으면 리프레시 토큰으로 자동 갱신하고, 새 리프레시 토큰이 오면 다시 저장합니다.
3. 리프레시 토큰은 약 60일 유효합니다. 카카오가 갱신 때 새 토큰을 주면 자동으로 늘어나므로 가끔이라도 쓰면 계속 유지됩니다. 60일 이상 한 번도 안 쓰면 다시 최초 인증이 필요합니다.

## 보내기 주소

| 방식 | 사용법 |
|---|---|
| 주소로 | `GET /api/notify?key=관리키&text=내용` (선택 `&link=https://...`) |
| 본문으로 | `POST /api/notify` + 헤더 `x-notify-key: 관리키` + JSON `{ "text": "내용", "link": "https://..." }` |

- 내용은 200자까지 보내집니다.
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
- `app/api/notify/route.js` : 보내기 주소
- `lib/kakao.js` : 토큰 발급·갱신, 전송
- `lib/store.js` : 토큰 저장소 (Blob, 테스트용 파일)
- `lib/guard.js` : 관리 키 확인

## 보안 메모

- 토큰 값은 화면·응답에 나오지 않습니다. 저장소는 비공개입니다.
- 관리 키가 있어야 인증을 시작하거나 보낼 수 있습니다. 주소에 키가 들어가는 방식(GET)은 접속 기록에 남을 수 있으니, 노출됐다고 생각되면 `NOTIFY_SECRET` 을 바꾸세요.

## 내 컴퓨터에서 실행

`.env.example` 을 `.env.local` 로 복사해 값을 채우고, 토큰을 파일로 쓰려면 `TOKEN_STORE_DIR=./.tokens` 를 추가합니다. `npm install` → `npm run dev`.
