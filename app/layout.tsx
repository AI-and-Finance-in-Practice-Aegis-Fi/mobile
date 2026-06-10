import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '직원 법인카드',
  description: 'Tap-and-Go 법인카드 결제 앱',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-200 flex justify-center min-h-screen">
        <div className="w-full max-w-[390px] min-h-screen bg-background relative">
          {children}
        </div>
      </body>
    </html>
  );
}
