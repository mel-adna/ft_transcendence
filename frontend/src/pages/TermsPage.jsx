import LegalPage, { LegalSection } from '../components/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 1, 2026">
      <p className="text-sm leading-relaxed text-muted">
        These terms cover your use of Team Pulse. By creating an account, you agree to the terms
        below. Please read them, they are short.
      </p>

      <LegalSection title="What this is">
        Team Pulse is a task and team collaboration tool built as a student software project. It
        is not a company, and it is not offered as a commercial product or service.
      </LegalSection>

      <LegalSection title="Acceptable use">
        <ul className="list-disc space-y-2 pl-5">
          <li>Use your real name and an email address you control.</li>
          <li>
            Do not use the app to harass, threaten or abuse anyone, including in chat messages or
            task comments.
          </li>
          <li>
            Do not attempt to gain unauthorized access to other accounts, workspaces or the server
            the application runs on.
          </li>
          <li>
            Do not upload illegal content, or content you do not have the right to share,
            including as an avatar image.
          </li>
          <li>Do not use automated tools to overload, scrape or disrupt the service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Accounts and your data">
        You are responsible for the accuracy of the information you provide and for keeping your
        password private. You can export or delete your data at any time from the Settings page.
        Deleting your account is permanent and cannot be reversed.
      </LegalSection>

      <LegalSection title="No warranty">
        This is a student project, provided as is, with no warranty of any kind, express or
        implied. It may contain bugs, may be interrupted, and may be reset or discontinued without
        notice. You use it at your own risk.
      </LegalSection>

      <LegalSection title="Limitation of liability">
        To the fullest extent permitted by law, the people who built this project are not liable
        for any damages or losses arising from your use of the application.
      </LegalSection>

      <LegalSection title="Changes to these terms">
        If these terms change, the last updated date at the top of this page will change with it.
      </LegalSection>
    </LegalPage>
  );
}
