'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API } from '@/lib/api';

const CATEGORY_KO: Record<string, string> = {
  Food: '식비', Transport: '교통', Entertainment: '접대/오락',
  Office: '사무용품', Other: '기타',
};

function ResultContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const id = Number(sp.get('id'));
  const isApproved = sp.get('is_approved') === 'true';
  const amount = Number(sp.get('amount'));
  const merchantName = sp.get('merchant_name') ?? '';
  const category = sp.get('category') ?? '';
  const userReason = sp.get('user_reason') ?? '';
  const aiReason = sp.get('ai_reason') ?? sp.get('reason') ?? '';

  const [ready, setReady] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalDone, setApprovalDone] = useState(false);
  const [approvalError, setApprovalError] = useState('');

  useEffect(() => {
    if (!sp.get('id') || sp.get('is_approved') === null) {
      router.replace('/');
    } else {
      setReady(true);
    }
  }, [router, sp]);

  async function handleExceptionApproval() {
    setApproving(true);
    setApprovalError('');
    try {
      const res = await fetch(API.requestApproval(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: userReason || '긴급 사유로 예외 승인 요청' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setApprovalError((d as { message?: string }).message ?? '예외 승인 요청에 실패했습니다.');
        return;
      }
      setApprovalDone(true);
    } catch {
      setApprovalError('예외 승인 요청에 실패했습니다.');
    } finally {
      setApproving(false);
    }
  }

  if (!ready) return null;

  const categoryLabel = CATEGORY_KO[category] ?? category;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-4 py-8">
      <button onClick={() => router.back()} className="self-start text-primary text-sm font-semibold mb-4">
        ← 뒤로가기
      </button>

      <div className="bg-card rounded-2xl p-6 flex flex-col items-center shadow-md">
        {/* 결과 아이콘 */}
        <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center mb-3 ${isApproved ? 'bg-success' : 'bg-danger'}`}>
          <span className="text-white text-4xl font-bold leading-none">{isApproved ? '✓' : '✕'}</span>
        </div>

        <h1 className={`text-xl font-bold mb-1 ${isApproved ? 'text-success' : 'text-danger'}`}>
          {isApproved ? '결제 승인' : '결제 차단'}
        </h1>

        <p className="text-3xl font-extrabold text-foreground mb-0.5">
          {amount.toLocaleString('ko-KR')}원
        </p>
        <p className="text-sm text-subtext">{merchantName}</p>

        {/* 카테고리 태그 */}
        {categoryLabel && (
          <span className="mt-2 px-3 py-0.5 bg-gray-100 text-subtext text-xs rounded-full">
            {categoryLabel}
          </span>
        )}

        {/* 구분선 */}
        {(userReason || aiReason) && <div className="w-full border-t border-gray-100 my-4" />}

        {/* 사용 사유 */}
        {userReason && (
          <div className="w-full bg-gray-50 rounded-xl p-3.5 mb-3">
            <p className="text-xs font-semibold text-subtext mb-1">사용 사유</p>
            <p className="text-sm text-foreground">{userReason}</p>
          </div>
        )}

        {/* AI 차단 사유 (차단 시만) */}
        {!isApproved && aiReason && (
          <div className="w-full bg-red-50 rounded-xl p-3.5 mb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs">🤖</span>
              <p className="text-xs font-semibold text-danger">AI 차단 사유</p>
            </div>
            <p className="text-sm text-foreground">{aiReason}</p>
          </div>
        )}

        {/* 예외 승인 요청 */}
        {!isApproved && !approvalDone && (
          <button onClick={handleExceptionApproval} disabled={approving}
            className="w-full bg-danger text-white font-bold text-sm rounded-xl py-4 disabled:opacity-60 flex items-center justify-center">
            {approving
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '예외 승인 요청'}
          </button>
        )}

        {approvalDone && (
          <div className="w-full bg-green-50 rounded-xl p-4">
            <p className="text-sm text-success text-center font-semibold">예외 승인 요청이 접수되었습니다.</p>
          </div>
        )}

        {approvalError && <p className="text-danger text-sm mt-2 text-center">{approvalError}</p>}
      </div>

      <button onClick={() => router.push('/')}
        className="w-full bg-primary text-white font-bold text-base rounded-xl py-4 mt-4 active:opacity-80">
        처음으로
      </button>
    </div>
  );
}

export default function ResultPage() {
  return <Suspense><ResultContent /></Suspense>;
}
