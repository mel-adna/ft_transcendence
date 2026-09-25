import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function LegalPage({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {updated}.</p>

        <div className="mt-8 space-y-8">{children}</div>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
