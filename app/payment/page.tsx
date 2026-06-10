'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CardComponent from '@/components/CardComponent';
import { API } from '@/lib/api';

const EMPLOYEE_ID = 1;
const EMPLOYEE_NAME = '홍길동';
const CARD_NUMBER = '1234567890123456';

type Category = 'Food' | 'Transport' | 'Entertainment' | 'Office' | 'Other';
const CATEGORIES: Category[] = ['Food', 'Transport', 'Entertainment', 'Office', 'Other'];

// NFC 물결 애니메이션
function NFCWave() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 py-12">
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        {[0, 0.45, 0.9].map((delay, i) => (
          <span
            key={i}
            className="absolute w-16 h-16 rounded-full border-2 border-primary"
            style={{ animation: `nfcWave 1.5s ease-out ${delay}s infinite` }}
          />
        ))}
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center relative z-10 shadow-lg">
          <span className="text-3xl">💳</span>
        </div>
      </div>
      <p className="text-foreground font-semibold text-base">결제 처리 중...</p>
      <p className="text-subtext text-sm">잠시만 기다려 주세요</p>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-sm text-subtext">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-lg text-foreground' : 'text-sm text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

// QR 모드: URL 파라미터로 결제 정보 자동 표시
function QRPaymentMode({
  merchant,
  amount,
  category,
  reason,
}: {
  merchant: string;
  amount: string;
  category: string;
  reason: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showNFC, setShowNFC] = useState(false);
  const [error, setError] = useState('');

  async function handleTap() {
    if (loading) return;
    setError('');

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(200);
    }

    setLoading(true);
    setShowNFC(true);

    try {
      const [res] = await Promise.all([
        fetch(API.requestPayment, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: EMPLOYEE_ID,
            merchant_name: merchant,
            amount: Number(amount),
            category,
            user_input_reason: reason,
          }),
        }),
        new Promise<void>((r) => setTimeout(r, 1500)),
      ]);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? '결제 요청에 실패했습니다.');
        setShowNFC(false);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const params = new URLSearchParams({
        id: String(data.id),
        is_approved: String(data.is_approved),
        amount: String(data.amount),
        merchant_name: data.merchant_name,
        ...(data.reason ? { reason: data.reason } : {}),
      });
      router.push(`/result?${params.toString()}`);
    } catch {
      setError('결제 요청에 실패했습니다. 다시 시도해주세요.');
      setShowNFC(false);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!showNFC && (
        <button onClick={() => router.back()} className="px-4 pt-5 pb-2 text-primary text-sm font-semibold text-left">
          ← 돌아가기
        </button>
      )}

      <h1 className="text-xl font-bold text-foreground px-4 mb-0.5">Tap-and-Go 결제</h1>
      {!showNFC && (
        <p className="text-xs text-subtext px-4 mb-1">QR 코드 스캔으로 가져온 결제 정보</p>
      )}

      <CardComponent employeeName={EMPLOYEE_NAME} cardNumber={CARD_NUMBER} />

      {showNFC ? (
        <NFCWave />
      ) : (
        <>
          <div className="mx-4 mt-3 bg-card rounded-2xl p-5 shadow-sm divide-y divide-gray-100">
            <div className="pb-3">
              <InfoRow label="가맹점" value={merchant} />
            </div>
            <div className="py-3">
              <InfoRow
                label="금액"
                value={`${Number(amount).toLocaleString('ko-KR')}원`}
                highlight
              />
            </div>
            <div className="py-3">
              <InfoRow label="카테고리" value={category} />
            </div>
            {reason && (
              <div className="pt-3">
                <InfoRow label="사유" value={reason} />
              </div>
            )}
          </div>

          {error && <p className="text-danger text-sm px-4 mt-3">{error}</p>}

          <div className="flex-1" />

          <div className="px-4 pb-10 pt-4">
            <button
              onClick={handleTap}
              className="w-full bg-primary text-white font-bold text-lg rounded-2xl py-5 shadow-lg active:scale-95 transition-transform"
            >
              💳 결제 요청
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 수동 입력 폼 (QR 파라미터 없을 때 fallback)
function ManualPaymentForm() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Food');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!merchantName.trim()) { setError('가맹점명을 입력해주세요.'); return; }
    const parsed = Number(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) { setError('유효한 금액을 입력해주세요.'); return; }
    if (!reason.trim()) { setError('사용 사유를 입력해주세요.'); return; }

    setLoading(true);
    try {
      const res = await fetch(API.requestPayment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: EMPLOYEE_ID,
          merchant_name: merchantName.trim(),
          amount: parsed,
          category,
          user_input_reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? '결제 요청에 실패했습니다.');
        return;
      }

      const data = await res.json();
      const params = new URLSearchParams({
        id: String(data.id),
        is_approved: String(data.is_approved),
        amount: String(data.amount),
        merchant_name: data.merchant_name,
        ...(data.reason ? { reason: data.reason } : {}),
      });
      router.push(`/result?${params.toString()}`);
    } catch {
      setError('결제 요청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full bg-card border border-gray-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-subtext outline-none focus:border-primary transition-colors';

  return (
    <div className="min-h-screen bg-background pb-8">
      <button onClick={() => router.back()} className="px-4 pt-5 pb-2 block text-primary text-sm font-semibold">
        ← 돌아가기
      </button>
      <h1 className="text-xl font-bold text-foreground px-4 mb-1">Tap-and-Go 결제</h1>
      <p className="text-xs text-subtext px-4 mb-2">직접 입력</p>

      <CardComponent employeeName={EMPLOYEE_NAME} cardNumber={CARD_NUMBER} />

      <form onSubmit={handleSubmit} className="px-4 mt-4 flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">가맹점명</label>
          <input type="text" value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="가맹점명 입력" className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">금액</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액 입력 (원)" className={inputClass} />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">카테고리</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={inputClass}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">사용 사유</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사용 사유를 입력해주세요" rows={3} className={`${inputClass} resize-none`} />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold text-base rounded-xl py-4 disabled:opacity-60 flex items-center justify-center">
          {loading
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : '결제 요청'}
        </button>
      </form>
    </div>
  );
}

function PaymentContent() {
  const sp = useSearchParams();
  const merchant = sp.get('merchant');
  const amount = sp.get('amount');

  if (merchant && amount) {
    return (
      <QRPaymentMode
        merchant={merchant}
        amount={amount}
        category={sp.get('category') ?? 'Other'}
        reason={sp.get('reason') ?? ''}
      />
    );
  }

  return <ManualPaymentForm />;
}

export default function PaymentPage() {
  return (
    <Suspense>
      <PaymentContent />
    </Suspense>
  );
}
