export function Stars({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap text-sm tracking-[1px]" role="img" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? "text-[#D4A02F]" : "text-partner-border"}>
          ★
        </span>
      ))}
    </span>
  );
}
