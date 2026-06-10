import type { Config } from 'tailwindcss';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  디자인 토큰 — Figma 확정 후 이 섹션만 수정하면 됩니다
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const colors = {
  primary:    '#2563EB',   // 주요 버튼·포인트
  success:    '#16A34A',   // 승인 상태
  danger:     '#DC2626',   // 차단·오류
  background: '#F3F4F6',   // 앱 배경
  foreground: '#111827',   // 본문 텍스트
  subtext:    '#6B7280',   // 보조 텍스트
  card:       '#FFFFFF',   // 카드/패널 배경
} as const;

const fontFamily = {
  sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
} as const;
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: { colors, fontFamily },
  },
  plugins: [],
};

export default config;
