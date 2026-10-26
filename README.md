# 카카오톡 나에게 보내기 (Next.js)

카카오 로그인 후, 입력한 글을 내 카카오톡(나와의 채팅)으로 보내는 웹페이지입니다.

## 사용한 카카오 API
- 카카오 로그인 (OAuth): `kauth.kakao.com/oauth/authorize`, `/oauth/token`
- 카카오톡 메시지 "나에게 보내기": `kapi.kakao.com/v2/api/talk/memo/default/send`

## 실행 방법
1. 카카오 개발자 콘솔(developers.kakao.com)에서 앱을 만들고 REST API 키를 확인
2. 카카오 로그인 활성화 + Redirect URI에 `http://localhost:3000/api/auth/callback` 등록
3. 동의항목에서 "카카오톡 메시지 전송(talk_message)" 설정
4. `.env.example` 을 `.env.local` 로 복사하고 REST API 키 입력
5. `npm install` → `npm run dev` → http://localhost:3000

## 구조
- `app/page.js` : 화면 (로그인 버튼, 메시지 입력, 보내기)
- `app/api/auth/*` : 로그인 · 콜백 · 상태 확인 · 로그아웃
- `app/api/send/route.js` : 카카오톡 메시지 전송

## 참고
- 토큰은 httpOnly 쿠키에 저장되어 브라우저 코드에서 읽을 수 없습니다.
- 배포 시 `KAKAO_REDIRECT_URI` 와 카카오 콘솔의 Redirect URI를 배포 주소로 바꿔야 합니다.
