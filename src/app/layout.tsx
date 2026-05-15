import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXTAUTH_URL ??
  "https://thegolfer.co.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "더 골프 — 시니어 맞춤 골프 투어",
    template: "%s | 더 골프",
  },
  description:
    "AI가 골라드리는 시니어 맞춤형 골프 투어 패키지. 전문 상담원이 24시간 내 연락드립니다.",
  applicationName: "더 골프",
  authors: [{ name: "더 골프" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "더 골프",
    url: SITE_URL,
    title: "더 골프 — 시니어 맞춤 골프 투어",
    description:
      "AI가 골라드리는 시니어 맞춤형 골프 투어 패키지. 전문 상담원이 24시간 내 연락드립니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "더 골프 — 시니어 맞춤 골프 투어",
    description:
      "AI가 골라드리는 시니어 맞춤형 골프 투어 패키지. 전문 상담원이 24시간 내 연락드립니다.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider session={session}>{children}</AuthProvider>
      </body>
    </html>
  );
}
