import type { Product } from "@/lib/types";

export function ProductArt({ art, color }: { art: Product["art"]; color: string }) {
  return (
    <svg className="my-1 h-art w-full" viewBox="0 0 72 72" aria-hidden="true">
      {artwork(art, color)}
    </svg>
  );
}

function artwork(art: Product["art"], color: string) {
  switch (art) {
    case "bottle":
      return (
        <>
          <rect x="31" y="8" width="10" height="8" rx="2" fill="#f4efe6" />
          <rect x="26" y="16" width="20" height="44" rx="8" fill={color} />
          <rect x="30" y="24" width="4" height="24" rx="2" fill="#ffffff" opacity="0.35" />
        </>
      );
    case "bubbles":
      return (
        <>
          <rect x="31" y="8" width="10" height="8" rx="2" fill="#f4efe6" />
          <rect x="26" y="16" width="20" height="44" rx="8" fill={color} />
          <circle cx="33" cy="32" r="2" fill="#ffffff" opacity="0.7" />
          <circle cx="40" cy="40" r="2.5" fill="#ffffff" opacity="0.7" />
          <circle cx="34" cy="48" r="1.6" fill="#ffffff" opacity="0.7" />
        </>
      );
    case "can":
      return (
        <>
          <ellipse cx="36" cy="14" rx="12" ry="4" fill="#f4efe6" />
          <rect x="24" y="14" width="24" height="46" rx="6" fill={color} />
          <rect x="24" y="24" width="24" height="9" fill="#f4efe6" />
          <ellipse cx="36" cy="60" rx="12" ry="4" fill={color} />
        </>
      );
    case "cup":
      return (
        <>
          <path d="M28 18c2-6 8-6 10 0" fill="none" stroke="#f4efe6" strokeWidth="1.6" opacity="0.7" />
          <rect x="20" y="26" width="26" height="26" rx="4" fill={color} />
          <path d="M46 30h6a8 8 0 0 1 0 16h-6" fill="none" stroke={color} strokeWidth="3" />
          <ellipse cx="33" cy="26" rx="13" ry="4" fill="#f4efe6" />
        </>
      );
    case "bag":
      return (
        <>
          <path d="M22 30 27 16h18l5 14 5 34H17Z" fill={color} />
          <path d="M27 16c6 8 12 8 18 0" fill="none" stroke="#2a2118" strokeWidth="1.6" />
          <rect x="30" y="36" width="12" height="8" rx="1" fill="#f4efe6" opacity="0.85" />
        </>
      );
    case "bar":
      return (
        <>
          <rect x="14" y="26" width="44" height="22" rx="3" fill={color} />
          <rect x="16" y="28" width="40" height="6" fill="#f4efe6" opacity="0.85" />
        </>
      );
    case "tin":
      return (
        <>
          <ellipse cx="36" cy="24" rx="16" ry="6" fill="#f4efe6" />
          <rect x="20" y="24" width="32" height="26" fill={color} />
          <ellipse cx="36" cy="50" rx="16" ry="6" fill={color} />
          <ellipse cx="36" cy="24" rx="10" ry="3" fill={color} opacity="0.45" />
        </>
      );
    case "apple":
      return (
        <>
          <circle cx="36" cy="40" r="16" fill={color} />
          <path d="M36 26c6-8 14-8 16-2" fill="none" stroke="#6f8f55" strokeWidth="2" />
          <ellipse cx="48" cy="22" rx="7" ry="3.5" fill="#6f8f55" transform="rotate(-20 48 22)" />
        </>
      );
    case "roll":
      return (
        <>
          <ellipse cx="36" cy="34" rx="22" ry="10" fill="#f0ddb0" />
          <rect x="16" y="32" width="40" height="8" fill={color} />
          <ellipse cx="36" cy="44" rx="22" ry="10" fill="#f7efe0" />
          <path d="M16 36h40" stroke="#c9843f" strokeWidth="1.4" />
        </>
      );
  }
}
