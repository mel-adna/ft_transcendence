import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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

        <h1 className="mt-6 text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#71717A]">Last updated: August 1, 2026.</p>

        <div className="mt-8 space-y-8">
          <p className="text-sm leading-relaxed text-[#71717A]">
            These terms cover your use of Team Pulse. By creating an account, you agree to the
            terms below. Please read them, they are short.
          </p>

          <section>
            <h2 className="text-lg font-bold text-white">What this is</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              Team Pulse is a task and team collaboration tool built as a student software
              project. It is not a company, and it is not offered as a commercial product or
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Acceptable use</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#71717A]">
              <li>Use your real name and an email address you control.</li>
              <li>
                Do not use the app to harass, threaten or abuse anyone, including in chat
                messages or task comments.
              </li>
              <li>
                Do not attempt to gain unauthorized access to other accounts, workspaces or the
                server the application runs on.
              </li>
              <li>
                Do not upload illegal content, or content you do not have the right to share,
                including as an avatar image.
              </li>
              <li>Do not use automated tools to overload, scrape or disrupt the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Accounts and your data</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              You are responsible for the accuracy of the information you provide and for
              keeping your password private. You can export or delete your data at any time from
              the Settings page. Deleting your account is permanent and cannot be reversed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">No warranty</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              This is a student project, provided as is, with no warranty of any kind, express or
              implied. It may contain bugs, may be interrupted, and may be reset or discontinued
              without notice. You use it at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Limitation of liability</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              To the fullest extent permitted by law, the people who built this project are not
              liable for any damages or losses arising from your use of the application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Changes to these terms</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#71717A]">
              If these terms change, the last updated date at the top of this page will change
              with it.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
