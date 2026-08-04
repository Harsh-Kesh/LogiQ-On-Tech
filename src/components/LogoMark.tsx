export default function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="LogiQ-On Tech mark">
      <defs>
        <linearGradient id="lg-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4C3AE3" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="32" height="32" rx="9" transform="rotate(45 20 20)" fill="url(#lg-mark)" />
      <g transform="translate(20,20) rotate(-45)">
        <rect x="-9" y="-7" width="2.4" height="14" fill="#fff" />
        <rect x="-4.6" y="-7" width="1.4" height="14" fill="#fff" opacity="0.85" />
        <rect x="-1" y="-7" width="2.4" height="14" fill="#fff" />
        <rect x="3.4" y="-7" width="1.4" height="14" fill="#fff" opacity="0.85" />
        <rect x="7" y="-7" width="2" height="14" fill="#fff" />
      </g>
    </svg>
  );
}
