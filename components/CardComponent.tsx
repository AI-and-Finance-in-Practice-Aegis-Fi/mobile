interface CardComponentProps {
  employeeName: string;
  cardNumber: string;
}

function maskCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const last4 = digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '0');
  return `•••• •••• •••• ${last4}`;
}

export default function CardComponent({ employeeName, cardNumber }: CardComponentProps) {
  return (
    <div
      className="mx-4 my-3 rounded-[12px] p-5 flex flex-col justify-between aspect-[86/54] relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #3A1F8F 0%, #1A3A8F 100%)',
        boxShadow: '0 8px 28px rgba(26, 15, 100, 0.40)',
      }}
    >
      {/* 상단 */}
      <div className="flex justify-between items-start">
        {/* 칩 */}
        <div
          className="w-10 h-7 rounded-[4px]"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5D980 50%, #C8991F 100%)',
          }}
        />
        {/* 브랜드 */}
        <span className="text-white text-xs font-bold tracking-[0.2em]">AEGIS-FI</span>
      </div>

      {/* 카드번호 */}
      <p
        className="text-white font-mono tracking-[0.22em] text-lg"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
      >
        {maskCardNumber(cardNumber)}
      </p>

      {/* 하단 */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-white/50 text-[9px] tracking-[0.15em] uppercase mb-0.5">Card Holder</p>
          <p className="text-white text-sm font-semibold tracking-wide uppercase">
            {employeeName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-[9px] tracking-[0.15em] uppercase mb-0.5">Expires</p>
          <p className="text-white text-sm font-semibold">12/27</p>
        </div>
      </div>
    </div>
  );
}
