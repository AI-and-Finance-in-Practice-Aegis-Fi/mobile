'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CardComponent from '@/components/CardComponent';
import { API } from '@/lib/api';

const EMPLOYEE_ID = 1;
const CARD_NUMBER = '1234567890123456';
const PROFILE_CACHE_KEY = `emp_profile_${EMPLOYEE_ID}`;

type Category = 'Food' | 'Transport' | 'Entertainment' | 'Office' | 'Other';
const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'Food', label: '식비' },
  { value: 'Transport', label: '교통' },
  { value: 'Entertainment', label: '접대/오락' },
  { value: 'Office', label: '사무용품' },
  { value: 'Other', label: '기타' },
];

interface PaymentResponse {
  transaction_id: number;
  is_approved: boolean;
  reason: string;
}

function NFCWave() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 py-12">
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        {[0, 0.45, 0.9].map((delay, i) => (
          <span key={i} className="absolute w-16 h-16 rounded-full border-2 border-primary"
            style={{ animation: `nfcWave 1.5s ease-out ${delay}s infinite` }} />
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
      <span className={`font-semibold ${highlight ? 'text-lg text-foreground' : 'text-sm text-foreground'}`}>{value}</span>
    </div>
  );
}

function useEmployeeName(): string {
  const [name, setName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) return JSON.parse(cached).employee_name ?? '';
    } catch {}
    return '';
  });

  useEffect(() => {
    if (name) return;
    fetch(API.employeeProfile(EMPLOYEE_ID))
      .then((r) => r.ok ? r.json() : null)
      .then((p) => {
        if (p?.employee_name) {
          setName(p.employee_name);
          sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
        }
      })
      .catch(() => {});
  }, [name]);

  return name;
}

function QRPaymentMode({ merchant, amount, category, reason }: {
  merchant: string; amount: string; category: string; reason: string;
}) {
  const router = useRouter();
  const employeeName = useEmployeeName();
  const [loading, setLoading] = useState(false);
  const [showNFC, setShowNFC] = useState(false);
  const [error, setError] = useState('');

  const CATEGORY_KO: Record<string, string> = {
    Food: '식비', Transport: '교통', Entertainment: '접대/오락',
    Office: '사무용품', Other: '기타',
  };

  async function handleTap() {
    if (loading) return;
    setError('');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(200);
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
        const d = await res.json().catch(() => ({}));
        setError((d as { message?: string }).message ?? '결제 요청에 실패했습니다.');
        setShowNFC(false); setLoading(false); return;
      }

      const data: PaymentResponse = await res.json();
      const params = new URLSearchParams({
        id: String(data.transaction_id),
        is_approved: String(data.is_approved),
        amount: amount,
        merchant_name: merchant,
        category: category,
        user_reason: reason,
        ...(data.reason ? { ai_reason: data.reason } : {}),
      });
      router.push(`/result?${params.toString()}`);
    } catch {
      setError('결제 요청에 실패했습니다. 다시 시도해주세요.');
      setShowNFC(false); setLoading(false);
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
      {!showNFC && <p className="text-xs text-subtext px-4 mb-1">QR 코드 스캔으로 가져온 결제 정보</p>}

      <CardComponent employeeName={employeeName} cardNumber={CARD_NUMBER} />

      {showNFC ? <NFCWave /> : (
        <>
          <div className="mx-4 mt-3 bg-card rounded-2xl p-5 shadow-sm divide-y divide-gray-100">
            <div className="pb-3"><InfoRow label="가맹점" value={merchant} /></div>
            <div className="py-3">
              <InfoRow label="금액" value={`${Number(amount).toLocaleString('ko-KR')}원`} highlight />
            </div>
            <div className="py-3">
              <InfoRow label="카테고리" value={CATEGORY_KO[category] ?? category} />
            </div>
            {reason && <div className="pt-3"><InfoRow label="사유" value={reason} /></div>}
          </div>
          {error && <p className="text-danger text-sm px-4 mt-3">{error}</p>}
          <div className="flex-1" />
          <div className="px-4 pb-10 pt-4">
            <button onClick={handleTap}
              className="w-full bg-primary text-white font-bold text-lg rounded-2xl py-5 shadow-lg active:scale-95 transition-transform">
              💳 결제 요청
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ManualPaymentForm() {
  const router = useRouter();
  const employeeName = useEmployeeName();
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
        const d = await res.json().catch(() => ({}));
        setError((d as { message?: string }).message ?? '결제 요청에 실패했습니다.');
        return;
      }

      const data: PaymentResponse = await res.json();
      const params = new URLSearchParams({
        id: String(data.transaction_id),
        is_approved: String(data.is_approved),
        amount: String(parsed),
        merchant_name: merchantName.trim(),
        category: category,
        user_reason: reason.trim(),
        ...(data.reason ? { ai_reason: data.reason } : {}),
      });
      router.push(`/result?${params.toString()}`);
    } catch {
      setError('결제 요청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full bg-card border border-gray-200 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-subtext outline-none focus:border-primary transition-colors';

  return (
    <div className="min-h-screen bg-background pb-8">
      <button onClick={() => router.back()} className="px-4 pt-5 pb-2 block text-primary text-sm font-semibold">← 돌아가기</button>
      <h1 className="text-xl font-bold text-foreground px-4 mb-1">Tap-and-Go 결제</h1>
      <p className="text-xs text-subtext px-4 mb-2">직접 입력</p>
      <CardComponent employeeName={employeeName} cardNumber={CARD_NUMBER} />

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
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1">사용 사유</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사용 사유를 입력해주세요" rows={3} className={`${inputClass} resize-none`} />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold text-base rounded-xl py-4 disabled:opacity-60 flex items-center justify-center">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '결제 요청'}
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
    return <QRPaymentMode merchant={merchant} amount={amount}
      category={sp.get('category') ?? 'Other'} reason={sp.get('reason') ?? ''} />;
  }
  return <ManualPaymentForm />;
}

export default function PaymentPage() {
  return <Suspense><PaymentContent /></Suspense>;
}
