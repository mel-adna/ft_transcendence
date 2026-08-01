import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0c0c14] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#71717A] transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#71717A]">Last updated: August 1, 2026.</p>

        <div className="mt-8 space-y-8">
          <p className="text-sm leading-relaxed text-[#71717A]">
            Team Pulse is a student software project built to manage tasks and communication
            inside small teams. This page explains, in plain terms, what information the
            application stores about you, why it is stored, and what control you have over it.
          </p>

          <section>
            <h2 className="text-lg font-bold text-white">Information we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#71717A]">
              <li>Your name (first name and last name).</li>
              <li>Your email address, which is also used to sign in.</li>
              <li>An avatar image URL, if you choose to add one.</li>
              <li>The tasks you create, are assigned to, or that belong to your teams.</li>
              <li>The chat messages you send inside a workspace.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Why we collect it</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              Your name, email and avatar are used to identify you to your teammates and to let
              you sign in to your account. Your tasks power the task board, dashboard and
              reporting features. Your chat messages exist so the chat feature can deliver them
              to the right workspace. None of this information is used for advertising, and none
              of it is sold or shared with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Where your data lives</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              Everything described above is stored in this project's own PostgreSQL database,
              run as part of the application's backend. There is no external analytics service
              and no third-party data broker involved in running Team Pulse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Your choices</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              From the Settings page, signed-in users can download a copy of everything stored
              about them (profile, teams and tasks) as a single file, at any time. From the same
              page, you can also permanently delete your account. Deleting your account removes
              your access immediately and cannot be undone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              This project does not run a support desk or a dedicated contact address. If you
              have a question about your own data, the export and delete tools in Settings are
              the fastest way to see or remove exactly what is stored about you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Changes to this policy</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              If this policy changes, the last updated date at the top of this page will change
              with it.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
