# Employee Mobile Web — CLAUDE.md

## 앱 개요

직원이 법인카드로 Tap-and-Go 결제를 요청하고, 결과를 확인하는 **Next.js 14 웹앱**입니다.
모바일 뷰(390px 고정) 기반으로 설계되었습니다.

## 기술 스택

| 항목 | 버전/라이브러리 |
|------|----------------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript (strict) |
| 스타일 | Tailwind CSS v3 |
| HTTP | fetch (내장) |

## 디자인 토큰 수정 방법

Figma 디자인이 확정되면 `tailwind.config.ts` 상단의 토큰 섹션만 수정하면
**모든 화면의 색상·폰트가 일괄 변경**됩니다.

| 토큰 | 기본값 | 사용 예 | 설명 |
|------|--------|---------|------|
| `primary` | `#2563EB` | `bg-primary`, `text-primary` | 주요 버튼·포인트 |
| `success` | `#16A34A` | `bg-success`, `text-success` | 승인 상태 |
| `danger` | `#DC2626` | `bg-danger`, `text-danger` | 차단·오류 |
| `background` | `#F3F4F6` | `bg-background` | 앱 배경 |
| `foreground` | `#111827` | `text-foreground` | 본문 텍스트 |
| `subtext` | `#6B7280` | `text-subtext` | 보조 텍스트 |
| `card` | `#FFFFFF` | `bg-card` | 카드/패널 배경 |

## 디렉터리 구조

```
app/
  layout.tsx          ← RootLayout (max-w-[390px] 모바일 컨테이너)
  globals.css         ← Tailwind 지시자
  page.tsx            ← 홈 대시보드
  payment/
    page.tsx          ← 결제 요청 폼
  result/
    page.tsx          ← 결제 결과 (URL 파라미터로 데이터 수신)
components/
  CardComponent.tsx   ← 카드 UI 컴포넌트 (홈·결제 공통)
lib/
  api.ts              ← BASE_URL 및 API 엔드포인트
tailwind.config.ts    ← 디자인 토큰 (여기서만 수정)
```

## API

- **Base URL**: `https://backend-production-3353.up.railway.app`
- 변경 시 `lib/api.ts`의 `BASE_URL` 상수만 수정

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/transactions?employee_id=1` | 최근 결제 내역 조회 |
| POST | `/api/v1/transactions/request` | 결제 요청 |
| POST | `/api/v1/approvals/{id}/request` | 예외 승인 요청 |

### POST /api/v1/transactions/request body
```json
{
  "employee_id": 1,
  "merchant_name": "스타벅스",
  "amount": 5500,
  "category": "Food",
  "user_input_reason": "팀 미팅 음료"
}
```

### POST /api/v1/approvals/{id}/request body
```json
{ "reason": "긴급 사유로 예외 승인 요청" }
```

## 화면별 역할

### `/` (홈)
- 거래 내역 최신 5건만 표시
- 월 사용 금액: 서버가 `monthly_usage` 필드를 내려주면 사용, 없으면 승인 거래 합산
- 하단 고정 버튼 → `/payment`

### `/payment` (결제 요청)
- 카테고리: `Food | Transport | Entertainment | Office | Other`
- 결제 요청 중 버튼 비활성화 + 로딩 스피너
- 결과 데이터를 URL 파라미터로 인코딩해 `/result`로 전달

### `/result` (결제 결과)
- URL 파라미터: `id`, `is_approved`, `amount`, `merchant_name`, `reason`
- `is_approved=true` → 초록 체크 + "결제 승인"
- `is_approved=false` → 빨간 X + "결제 차단" + 차단 사유
- 차단 시 "예외 승인 요청" 버튼 표시 (요청 완료 후 숨김)
- "처음으로" → `/`

## 하드코딩된 값 (추후 교체 대상)

| 파일 | 상수 | 설명 |
|------|------|------|
| `app/page.tsx`, `app/payment/page.tsx` | `EMPLOYEE_ID = 1` | 인증 연동 후 교체 |
| `app/page.tsx`, `app/payment/page.tsx` | `EMPLOYEE_NAME = '홍길동'` | 프로필 API 연동 후 교체 |
| `app/page.tsx`, `app/payment/page.tsx` | `CARD_NUMBER = '1234...'` | 카드 API 연동 후 교체 |

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속
모바일 확인: 개발자 도구 → 390×844 (iPhone 14)
