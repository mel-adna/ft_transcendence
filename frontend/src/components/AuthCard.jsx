import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function AuthCard({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-muted/20 bg-panel p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
            <Icon size={24} className="text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>

        {children}

        {footer ?? (
          <div className="mt-6 border-t border-card pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
