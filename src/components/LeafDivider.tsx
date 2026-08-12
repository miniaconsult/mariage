export function LeafDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 24"
      className={`mx-auto h-5 w-40 text-sage-500 ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12 H80 M120 12 H198"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <g fill="currentColor">
        <ellipse cx="92" cy="8" rx="5" ry="2.6" transform="rotate(-30 92 8)" />
        <ellipse cx="100" cy="6" rx="5" ry="2.6" transform="rotate(-5 100 6)" />
        <ellipse cx="108" cy="8" rx="5" ry="2.6" transform="rotate(30 108 8)" />
        <ellipse cx="100" cy="15" rx="4.5" ry="2.4" transform="rotate(90 100 15)" />
      </g>
    </svg>
  );
}
