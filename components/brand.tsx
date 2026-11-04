/** The PetPro mark: a paw on the accent tile, with the two-tone wordmark */
export function BrandMark({ withName = true }: { withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-accent" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-accent-ink)">
          <ellipse cx="6" cy="11" rx="2.1" ry="2.7" />
          <ellipse cx="10" cy="6.8" rx="2.1" ry="2.8" />
          <ellipse cx="14.2" cy="6.8" rx="2.1" ry="2.8" />
          <ellipse cx="18.2" cy="11" rx="2.1" ry="2.7" />
          <path d="M12.1 11.4c-2.9 0-5.4 2.8-5.4 5.5 0 1.7 1.3 2.7 2.8 2.7 1 0 1.6-.5 2.6-.5s1.6.5 2.6.5c1.5 0 2.8-1 2.8-2.7 0-2.7-2.5-5.5-5.4-5.5z" />
        </svg>
      </span>
      {withName && (
        <span className="font-display text-[22px] font-bold">
          Pet<span className="text-accent-strong">Pro</span>
        </span>
      )}
    </span>
  );
}
