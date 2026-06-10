import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aegis-Fi 법인카드',
  description: 'Tap-and-Go 법인카드 결제 앱',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aegis-Fi',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563EB',
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
