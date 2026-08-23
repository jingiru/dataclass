import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get('host') ?? '';
  const isTrustedSiteHost = requestHost.startsWith('datapick-classroom.') && requestHost.endsWith('.chatgpt.site');
  const origin = isTrustedSiteHost ? `https://${requestHost}` : 'http://localhost:3000';
  const socialImage = new URL('/og.png', origin).toString();

  return {
    title: '데이터픽 | 데이터 분석 수행평가',
    description: '중학생을 위한 데이터 분석 미션형 수행평가 플랫폼',
    openGraph: {
      title: '데이터픽 | 데이터 분석 수행평가',
      description: '데이터를 읽고, 그리고, 판단하는 미션형 수행평가',
      images: [{ url: socialImage, width: 1200, height: 630, alt: '데이터픽 — 데이터를 읽고, 그리고, 판단하다' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: '데이터픽 | 데이터 분석 수행평가',
      description: '데이터를 읽고, 그리고, 판단하는 미션형 수행평가',
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
