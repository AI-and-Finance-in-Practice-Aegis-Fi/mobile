export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} style={style} />;
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* 헤더 */}
      <div className="px-4 pt-6 pb-2 flex justify-between items-start">
        <div>
          <Skeleton className="h-6 w-28 mb-1.5" />
          <Skeleton className="h-5 w-36 mb-1.5" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>

      {/* 카드 */}
      <Skeleton className="mx-4 my-3 rounded-2xl" style={{ aspectRatio: '86/54' } as React.CSSProperties} />

      {/* 예산 바 */}
      <div className="mx-4 mt-2 bg-card rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between mb-3">
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-28" />
          </div>
          <div className="flex flex-col items-end">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-2 w-full" />
        <div className="flex justify-between mt-1">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* 섹션 헤더 */}
      <div className="flex justify-between px-4 mt-5 mb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-14" />
      </div>

      {/* 거래 목록 */}
      <div className="px-4 flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-xl p-4 flex justify-between items-center shadow-sm">
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
