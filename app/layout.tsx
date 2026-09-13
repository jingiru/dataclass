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
    description: '구글 스프레드시트 분석 결과와 서술형 설명을 기록하는 네 가지 데이터 탐구 수행평가',
    openGraph: {
      title: '데이터픽 | 데이터 분석 수행평가',
      description: '이상 데이터, 피벗 테이블, 시각화, 정규화와 데이터 관계를 탐구하는 포트폴리오',
      images: [{ url: socialImage, width: 1200, height: 630, alt: '데이터픽 — 데이터를 읽고, 그리고, 판단하다' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: '데이터픽 | 데이터 분석 수행평가',
      description: '이상 데이터, 피벗 테이블, 시각화, 정규화와 데이터 관계를 탐구하는 포트폴리오',
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

