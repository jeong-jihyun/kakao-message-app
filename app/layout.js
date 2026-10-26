export const metadata = {
  title: "카카오톡 나에게 보내기",
  description: "카카오 오픈 API로 나에게 카카오톡 메시지 보내기",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, 'Malgun Gothic', sans-serif",
          background: "#f5f5f5",
        }}
      >
        {children}
      </body>
    </html>
  );
}
