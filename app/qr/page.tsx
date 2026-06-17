import Image from 'next/image';
import Link from 'next/link';

const QR_ITEMS = [
  {
    file: '/qr/qr-normal.png',
    title: 'GS25 편의점',
    amount: '15,800원',
    category: 'Food · 점심식대',
    badge: '승인 예상',
    badgeClass: 'bg-success text-background',
  },
  {
    file: '/qr/qr-blocked.png',
    title: '스타벅스',
    amount: '500,000원',
    category: 'Entertainment · 팀회식',
    badge: '차단 예상',
    badgeClass: 'bg-danger text-white',
  },
];

export default function QRPage() {
  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Link href="/" className="text-primary text-sm font-semibold">
          홈
        </Link>
        <h1 className="text-2xl font-extrabold text-foreground">시연용 QR 코드</h1>
      </div>

      <p className="px-4 text-xs text-subtext mb-4">
        폰 카메라로 아래 QR을 스캔하면 결제 화면으로 바로 진입합니다.
      </p>

      <div className="px-4 flex flex-col gap-5">
        {QR_ITEMS.map((item) => (
          <div key={item.file} className="dashboard-panel rounded-[22px] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-base font-bold text-foreground">{item.title}</p>
                <p className="text-xs text-subtext mt-0.5">{item.category}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-base font-bold text-foreground">{item.amount}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.badgeClass}`}>
                  {item.badge}
                </span>
              </div>
            </div>

            <div className="flex justify-center bg-white rounded-2xl p-3">
              <Image
                src={item.file}
                alt={`${item.title} QR 코드`}
                width={280}
                height={280}
                className="rounded"
                unoptimized
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
