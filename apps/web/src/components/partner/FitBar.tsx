/** "% adapté" bar — null means the score isn't computed until validation. */
export function FitBar({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return <span className="text-[12.5px] text-partner-muted">Calcul après validation</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-partner-leaf" aria-label={`${value} % adapté`}>
      <i className="block h-1.5 w-[60px] overflow-hidden rounded-full bg-partner-leafBg not-italic">
        <b className="block h-full rounded-full bg-partner-leaf" style={{ width: `${value}%` }} />
      </i>
      {value} %
    </span>
  );
}
