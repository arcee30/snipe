export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={`${className} shrink-0`}
      fill="none"
    >
      <rect width="64" height="64" rx="16" fill="#151515" />
      <circle cx="32" cy="32" r="21" stroke="#c99a2e" strokeWidth="4" />
      <path
        d="M32 8v8M32 48v8M8 32h8M48 32h8"
        stroke="#f7f4ee"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M20 39c5 6 18 5 22-3 4-9-8-11-14-8-5 2-6 8 0 10 6 3 15 0 18-7"
        stroke="#f7f4ee"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path d="M25 38 44 19l3 3-19 19-8 3 5-6Z" fill="#c99a2e" />
      <circle cx="31" cy="32" r="3" fill="#151515" />
    </svg>
  );
}
