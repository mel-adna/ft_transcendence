import { Link } from 'react-router-dom';

export default function LegalLinks({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-[11px] text-muted ${className}`}>
      <Link to="/privacy" className="transition-colors hover:text-white">
        Privacy Policy
      </Link>
      <span>&bull;</span>
      <Link to="/terms" className="transition-colors hover:text-white">
        Terms of Service
      </Link>
    </div>
  );
}
