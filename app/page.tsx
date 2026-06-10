'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CardComponent from '@/components/CardComponent';
import { HomeSkeleton } from '@/components/Skeleton';
import { API } from '@/lib/api';

const EMPLOYEE_ID = 1;
const CARD_NUMBER = '1234567890123456';
const PROFILE_CACHE_KEY = `emp_profile_${EMPLOYEE_ID}`;

interface EmployeeProfile {
  employee_id: number;
  employee_name: string;
  position: string;
  department_id: number;
  department_name: string;
  monthly_budget_limit: number;
}

interface Transaction {
  transaction_id: number;
  employee_id: number;
  employee_name: string;
  merchant_name: string;
  amount: number | string;
  category: string;
  user_input_reason?: string | null;
  is_approved: boolean | null;
  payment_time?: string | null;
  created_at?: string | null;
  ai_risk_reason?: string | null;
}

const CATEGORY_KO: Record<string, string> = {
  Food: '식비', Transport: '교통', Entertainment: '접대/오락',
  Office: '사무용품', Other: '기타',
};

function formatAmount(n: number) {
  return Math.round(n).toLocaleString('ko-KR') + '원';
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isThisMonth(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function calcMonthlyUsage(list: Transaction[]): number {
  return list
    .filter((t) => t.is_approved === true && isThisMonth(t.payment_time ?? t.created_at))
    .reduce((s, t) => s + Number(t.amount), 0);
}

// sessionStorage에서 프로필 동기 초기화
function loadCachedProfile(): EmployeeProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function BudgetSummary({ usage, budget }: { usage: number | null; budget: number }) {
  const u = usage ?? 0;
  const remaining = budget - u;
  const progress = budget > 0 ? Math.min((u / budget) * 100, 100) : 0;
  const overBudget = remaining < 0;
  const barColor = progress >= 90 ? 'bg-danger' : progress >= 70 ? 'bg-yellow-400' : 'bg-success';

  return (
    <div className="mx-4 mt-2 bg-card rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-subtext mb-0.5">이번 달 사용</p>
          <p className="text-xl font-bold text-foreground">
            {usage !== null ? formatAmount(u) : '-'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-subtext mb-0.5">잔여 한도</p>
          <p className={`text-sm font-bold ${overBudget ? 'text-danger' : 'text-success'}`}>
            {usage !== null
              ? overBudget ? `${formatAmount(Math.abs(remaining))} 초과` : formatAmount(remaining)
              : '-'}
          </p>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <p className="text-xs text-subtext">0원</p>
        <p className="text-xs text-subtext">{Math.round(progress)}% / {formatAmount(budget)}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  // 프로필: sessionStorage에서 즉시 초기화 → API 호출 불필요 시 스켈레톤 없음
  const [profile, setProfile] = useState<EmployeeProfile | null>(loadCachedProfile);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<number | null>(null);
  const [txLoading, setTxLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const fetchData = useCallback(async () => {
    setTxLoading(true);

    const jobs: Promise<void>[] = [];

    // 트랜잭션은 항상 최신 데이터 필요
    jobs.push(
      fetch(API.transactions(EMPLOYEE_ID))
        .then((r) => r.ok ? r.json() : [])
        .then((list) => {
          const arr: Transaction[] = Array.isArray(list) ? list : [];
          setTransactions(arr.slice(0, 5));
          setMonthlyUsage(calcMonthlyUsage(arr));
        })
        .catch(() => {})
    );

    // 프로필 캐시 없을 때만 fetch
    if (!sessionStorage.getItem(PROFILE_CACHE_KEY)) {
      jobs.push(
        fetch(API.employeeProfile(EMPLOYEE_ID))
          .then((r) => r.ok ? r.json() : null)
          .then((p: EmployeeProfile | null) => {
            if (!p) return;
            setProfile(p);
            sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
          })
          .catch(() => {})
      );
    }

    await Promise.all(jobs);
    setTxLoading(false);
  }, []);

  // SSE 실시간 연결
  useEffect(() => {
    fetchData();

    const es = new EventSource(API.transactionStream());
    esRef.current = es;
    es.onopen = () => setSseConnected(true);

    es.addEventListener('transaction', (e) => {
      try {
        const tx = JSON.parse(e.data) as Transaction;
        if (tx.employee_id !== EMPLOYEE_ID) return;

        setTransactions((prev) =>
          [tx, ...prev.filter((t) => t.transaction_id !== tx.transaction_id)].slice(0, 5)
        );
        if (tx.is_approved === true && isThisMonth(tx.payment_time ?? tx.created_at)) {
          setMonthlyUsage((prev) => (prev ?? 0) + Number(tx.amount));
        }
      } catch {}
    });

    es.onerror = () => setSseConnected(false);

    return () => { es.close(); esRef.current = null; };
  }, [fetchData]);

  function handleTxClick(tx: Transaction) {
    const params = new URLSearchParams({
      id: String(tx.transaction_id),
      is_approved: String(tx.is_approved ?? false),
      amount: String(tx.amount),
      merchant_name: tx.merchant_name,
      ...(tx.category ? { category: tx.category } : {}),
      ...(tx.user_input_reason ? { user_reason: tx.user_input_reason } : {}),
      ...(tx.ai_risk_reason ? { ai_reason: tx.ai_risk_reason } : {}),
    });
    router.push(`/result?${params.toString()}`);
  }

  // 프로필도 없고 트랜잭션도 로딩 중이면 전체 스켈레톤
  if (!profile && txLoading) return <HomeSkeleton />;

  const employeeName = profile?.employee_name ?? '';
  const budget = profile?.monthly_budget_limit ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <div>
            <p className="text-sm text-subtext">안녕하세요 👋</p>
            <h1 className="text-xl font-bold text-foreground">{employeeName}님</h1>
            {profile && (
              <p className="text-xs text-subtext mt-0.5">
                {profile.department_name} · {profile.position}
              </p>
            )}
          </div>
          <button
            onClick={() => router.push('/qr')}
            className="text-xs bg-primary/10 text-primary font-semibold px-3 py-1.5 rounded-full"
          >
            QR 시연
          </button>
        </div>

        <CardComponent employeeName={employeeName} cardNumber={CARD_NUMBER} />
        <BudgetSummary usage={monthlyUsage} budget={budget} />

        {/* 최근 결제 내역 */}
        <div className="flex items-center justify-between px-4 mt-5 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">최근 결제 내역</h2>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-success animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-[10px] text-subtext">{sseConnected ? '실시간' : '오프라인'}</span>
            </div>
          </div>
          <button onClick={fetchData} className="text-xs text-primary font-medium">새로고침</button>
        </div>

        {txLoading ? (
          <div className="px-4 flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 flex justify-between items-center shadow-sm animate-pulse">
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded-lg mb-2" />
                  <div className="h-3 w-24 bg-gray-200 rounded-lg" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="h-4 w-20 bg-gray-200 rounded-lg" />
                  <div className="h-5 w-10 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-subtext text-sm py-10">결제 내역이 없습니다.</p>
        ) : (
          <div className="px-4 flex flex-col gap-2">
            {transactions.map((tx) => (
              <div
                key={tx.transaction_id}
                onClick={() => handleTxClick(tx)}
                className="bg-card rounded-xl p-4 shadow-sm flex justify-between items-center cursor-pointer active:opacity-70 transition-opacity"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-semibold text-foreground truncate">{tx.merchant_name}</p>
                  <p className="text-xs text-subtext mt-0.5">
                    {formatDate(tx.payment_time ?? tx.created_at)}
                    {tx.category && (
                      <span className="ml-1.5 text-subtext/70">
                        · {CATEGORY_KO[tx.category] ?? tx.category}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatAmount(Number(tx.amount))}</p>
                  <span className={`text-xs font-semibold text-white px-2 py-0.5 rounded ${
                    tx.is_approved === true ? 'bg-success' : tx.is_approved === false ? 'bg-danger' : 'bg-gray-400'
                  }`}>
                    {tx.is_approved === true ? '승인' : tx.is_approved === false ? '차단' : '대기'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
