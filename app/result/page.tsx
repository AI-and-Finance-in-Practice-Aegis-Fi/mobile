'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API } from '@/lib/api';

function ResultContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const id = Number(sp.get('id'));
  const isApproved = sp.get('is_approved') === 'true';
  const amount = Number(sp.get('amount'));
  const merchantName = sp.get('merchant_name') ?? '';
  const reason = sp.get('reason') ?? '';

  const [approving, setApproving] = useState(false);
  const [approvalDone, setApprovalDone] = useState(false);
  const [approvalError, setApprovalError] = useState('');

  async function handleExceptionApproval() {
    setApproving(true);
    setApprovalError('');
    try {
      const res = await fetch(API.requestApproval(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: '긴급 사유로 예외 승인 요청' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setApprovalError((data as { message?: string }).message ?? '예외 승인 요청에 실패했습니다.');
        return;
      }
      setApprovalDone(true);
    } catch {
      setApprovalError('예외 승인 요청에 실패했습니다.');
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-4 py-8">
      <div className="bg-card rounded-2xl p-6 flex flex-col items-center shadow-md">
        {/* 결과 아이콘 */}
        <div
          className={`w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4 ${
            isApproved ? 'bg-success' : 'bg-danger'
          }`}
        >
          <span className="text-white text-4xl font-bold leading-none">
            {isApproved ? '✓' : '✕'}
          </span>
        </div>

        {/* 결과 제목 */}
        <h1 className={`text-xl font-bold mb-2 ${isApproved ? 'text-success' : 'text-danger'}`}>
          {isApproved ? '결제 승인' : '결제 차단'}
        </h1>

        {/* 금액 */}
        <p className="text-3xl font-extrabold text-foreground mb-1">
          {amount.toLocaleString('ko-KR')}원
        </p>

        {/* 가맹점 */}
        <p className="text-sm text-subtext mb-4">{merchantName}</p>

        {/* 차단 사유 */}
        {!isApproved && reason && (
          <div className="w-full bg-red-50 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-danger mb-1">차단 사유</p>
            <p className="text-sm text-foreground">{reason}</p>
          </div>
        )}

        {/* 예외 승인 요청 버튼 */}
        {!isApproved && !approvalDone && (
          <button
            onClick={handleExceptionApproval}
            disabled={approving}
            className="w-full bg-danger text-white font-bold text-sm rounded-xl py-4 disabled:opacity-60 flex items-center justify-center"
          >
            {approving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '예외 승인 요청'}
          </button>
        )}

        {approvalDone && (
          <div className="w-full bg-green-50 rounded-xl p-4">
            <p className="text-sm text-success text-center font-semibold">
              예외 승인 요청이 접수되었습니다.
            </p>
          </div>
        )}

        {approvalError && <p className="text-danger text-sm mt-2">{approvalError}</p>}
      </div>

      {/* 처음으로 버튼 */}
      <button
        onClick={() => router.push('/')}
        className="w-full bg-primary text-white font-bold text-base rounded-xl py-4 mt-4 active:opacity-80"
      >
        처음으로
      </button>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
