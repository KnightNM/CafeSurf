import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? 'brandCompact' : ''}`} to="/" aria-label="CafeSurf home">
      <svg className="brandSymbol" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="8" width="18" height="14" rx="4" />
        <rect x="26" y="26" width="18" height="14" rx="4" />
        <path d="M18 22v4a6 6 0 0 0 6 6h2M30 26v-4a6 6 0 0 0-6-6h-2" />
        <circle cx="10" cy="15" r="2" />
        <circle cx="38" cy="33" r="2" />
      </svg>
      <span className="brandWord">CafeSurf</span>
    </Link>
  );
}
