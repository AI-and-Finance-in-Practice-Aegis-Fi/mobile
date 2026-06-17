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
      className="mx-4 my-3 rounded-[22px] p-5 flex flex-col justify-between aspect-[86/54] relative overflow-hidden border border-white/10"
      style={{
        background: 'radial-gradient(circle at 18% 18%, rgba(255, 230, 236, 0.24), transparent 32%), linear-gradient(135deg, #111827 0%, #151b24 44%, #070b10 100%)',
        boxShadow: '0 22px 52px rgba(0, 0, 0, 0.42)',
      }}
    >
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
      <div className="absolute -left-8 bottom-4 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />

      <div className="flex justify-between items-start">
        <div
          className="w-10 h-7 rounded-md border border-black/10"
          style={{
            background: 'linear-gradient(135deg, #fffbd1 0%, #e4c7ce 52%, #6baec9 100%)',
          }}
        />
        <span className="text-foreground text-xs font-bold tracking-[0.2em]">AEGIS-FI</span>
      </div>

      <p
        className="text-foreground font-mono tracking-[0.22em] text-lg relative z-10"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
      >
        {maskCardNumber(cardNumber)}
      </p>

      <div className="flex justify-between items-end relative z-10">
        <div>
          <p className="text-subtext text-[9px] tracking-[0.15em] uppercase mb-0.5">Card Holder</p>
          <p className="text-foreground text-sm font-semibold tracking-wide uppercase">
            {employeeName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-subtext text-[9px] tracking-[0.15em] uppercase mb-0.5">Expires</p>
          <p className="text-foreground text-sm font-semibold">12/27</p>
        </div>
      </div>
    </div>
  );
}
