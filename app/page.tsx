'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CardComponent from '@/components/CardComponent';
import { HomeSkeleton } from '@/components/Skeleton';
import { API } from '@/lib/api';
import { EMPLOYEE_ID, CARD_NUMBER, PROFILE_CACHE_KEY, CATEGORY_KO } from '@/lib/constants';

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
  const barColor = progress >= 90 ? 'bg-danger' : progress >= 70 ? 'bg-accent' : 'bg-primary';

  return (
    <div className="mx-4 mt-2 dashboard-panel rounded-[22px] p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-subtext mb-1">이번 달 사용</p>
          <p className="text-2xl font-extrabold text-accent">
            {usage !== null ? formatAmount(u) : '-'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-subtext mb-1">잔여 한도</p>
          <p className={`text-sm font-bold ${overBudget ? 'text-danger' : 'text-success'}`}>
            {usage !== null
              ? overBudget ? `${formatAmount(Math.abs(remaining))} 초과` : formatAmount(remaining)
              : '-'}
          </p>
        </div>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between mt-2">
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
  const sseRetryRef = useRef(0);

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

    // 항상 최신 프로필 fetch (캐시는 초기 렌더용, API가 우선)
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

    await Promise.all(jobs);
    setTxLoading(false);
  }, []);

  // SSE 실시간 연결 (자동 재연결: 지수 백오프 2s→4s→8s…최대 30s)
  useEffect(() => {
    fetchData();

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const es = new EventSource(API.transactionStream());
      esRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
        sseRetryRef.current = 0;
      };

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

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        const delay = Math.min(2000 * Math.pow(2, sseRetryRef.current), 30000);
        sseRetryRef.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
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
      <div className="flex-1 overflow-y-auto pb-28">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pt-7 pb-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-subtext uppercase">Aegis-Fi</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-foreground">대시보드</h1>
            {profile && (
              <p className="text-xs text-subtext mt-1.5">
                {employeeName} · {profile.department_name} · {profile.position}
              </p>
            )}
          </div>
          <button
            onClick={() => router.push('/qr')}
            className="dashboard-ghost-button text-xs px-3.5 py-2 rounded-xl"
          >
            QR 시연
          </button>
        </div>

        <CardComponent employeeName={employeeName} cardNumber={CARD_NUMBER} />
        <BudgetSummary usage={monthlyUsage} budget={budget} />

        {/* 최근 결제 내역 */}
        <div className="flex items-center justify-between px-4 mt-5 mb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">최근 결제 내역</h2>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
              <span className="text-[10px] text-subtext">{sseConnected ? '실시간' : '오프라인'}</span>
            </div>
          </div>
          <button onClick={fetchData} className="text-xs text-primary font-semibold">새로고침 →</button>
        </div>

        {txLoading ? (
          <div className="px-4 flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-panel rounded-2xl p-4 flex justify-between items-center animate-pulse">
                <div>
                  <div className="h-4 w-28 bg-secondary rounded-lg mb-2" />
                  <div className="h-3 w-24 bg-secondary rounded-lg" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="h-4 w-20 bg-secondary rounded-lg" />
                  <div className="h-5 w-10 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="mx-4 dashboard-panel rounded-2xl p-8 text-center">
            <p className="text-subtext text-sm">결제 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="px-4 flex flex-col gap-2">
            {transactions.map((tx) => (
              <div
                key={tx.transaction_id}
                onClick={() => handleTxClick(tx)}
                className="dashboard-panel rounded-2xl p-4 flex justify-between items-center cursor-pointer active:bg-muted transition-colors"
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
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    tx.is_approved === true ? 'bg-success text-background' : tx.is_approved === false ? 'bg-danger text-white' : 'bg-secondary text-subtext'
                  }`}>
                    {tx.is_approved === true ? '승인' : tx.is_approved === false ? '차단' : '대기'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-background/95 border-t border-border px-4 py-4 backdrop-blur">
        <button
          onClick={() => router.push('/payment')}
          className="w-full dashboard-button text-base rounded-2xl py-4"
        >
          Tap-and-Go 결제
        </button>
      </div>
    </div>
  );
}
