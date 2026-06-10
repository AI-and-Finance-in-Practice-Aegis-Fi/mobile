'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CardComponent from '@/components/CardComponent';
import { API } from '@/lib/api';

const EMPLOYEE_ID = 1;
const EMPLOYEE_NAME = '홍길동';
const CARD_NUMBER = '1234567890123456';
const MONTHLY_BUDGET = 1_000_000;

interface Transaction {
  id: number;
  merchant_name: string;
  amount: number | string;
  payment_time?: string | null;
  created_at?: string | null;
  is_approved: boolean;
  category: string;
}

function formatAmount(n: number) {
  return Math.round(n).toLocaleString('ko-KR') + '원';
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function HomePage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<number | null>(null);
  const [remainingLimit, setRemainingLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API.transactions(EMPLOYEE_ID));
      const data = await res.json();
      const list: Transaction[] = Array.isArray(data) ? data : [];
      setTransactions(list.slice(0, 5));

      if (data.monthly_usage !== undefined) {
        setMonthlyUsage(data.monthly_usage);
        setRemainingLimit(data.remaining_limit);
      } else {
        const now = new Date();
        const thisMonthTotal = list
          .filter((t) => {
            if (!t.is_approved) return false;
            const raw = t.payment_time ?? t.created_at;
            if (!raw) return false;
            const d = new Date(raw);
            return (
              !isNaN(d.getTime()) &&
              d.getFullYear() === now.getFullYear() &&
              d.getMonth() === now.getMonth()
            );
          })
          .reduce((s, t) => s + Number(t.amount), 0);
        const budget = Number(data.budget_limit ?? MONTHLY_BUDGET);
        setMonthlyUsage(thisMonthTotal);
        setRemainingLimit(budget - thisMonthTotal);
      }
    } catch {
      // 네트워크 오류 시 빈 상태 유지
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* 인사말 */}
        <div className="px-4 pt-6 pb-2">
          <h1 className="text-xl font-bold text-foreground">안녕하세요 👋 {EMPLOYEE_NAME}님</h1>
        </div>

        {/* 카드 */}
        <CardComponent employeeName={EMPLOYEE_NAME} cardNumber={CARD_NUMBER} />

        {/* 사용 요약 */}
        <div className="flex gap-2 px-4 mt-2">
          <div className="flex-1 bg-card rounded-xl p-4 shadow-sm">
            <p className="text-xs text-subtext mb-1">이번 달 사용</p>
            <p className="text-base font-bold text-foreground">
              {monthlyUsage !== null ? formatAmount(monthlyUsage) : '-'}
            </p>
          </div>
          <div className="flex-1 bg-card rounded-xl p-4 shadow-sm">
            <p className="text-xs text-subtext mb-1">잔여 한도</p>
            <p className={`text-base font-bold ${remainingLimit !== null && remainingLimit < 0 ? 'text-danger' : 'text-success'}`}>
              {remainingLimit !== null ? formatAmount(Math.abs(remainingLimit)) : '-'}
              {remainingLimit !== null && remainingLimit < 0 && ' 초과'}
            </p>
          </div>
        </div>

        {/* 최근 결제 내역 */}
        <div className="flex items-center justify-between px-4 mt-6 mb-3">
          <h2 className="text-sm font-semibold text-foreground">최근 결제 내역</h2>
          <button onClick={fetchData} className="text-xs text-primary font-medium">
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-subtext text-sm py-10">결제 내역이 없습니다.</p>
        ) : (
          <div className="px-4 flex flex-col gap-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-card rounded-xl p-4 shadow-sm flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{tx.merchant_name}</p>
                  <p className="text-xs text-subtext mt-0.5">{formatDate(tx.payment_time ?? tx.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-bold text-foreground">{formatAmount(Number(tx.amount))}</p>
                  <span
                    className={`text-xs font-semibold text-white px-2 py-0.5 rounded ${
                      tx.is_approved ? 'bg-success' : 'bg-danger'
                    }`}
                  >
                    {tx.is_approved ? '승인' : '차단'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-background border-t border-gray-200 px-4 py-4">
        <button
          onClick={() => router.push('/payment')}
          className="w-full bg-primary text-white font-bold text-base rounded-xl py-4 active:opacity-80"
        >
          💳 Tap-and-Go 결제
        </button>
      </div>
    </div>
  );
}
