import LegalPage, { LegalSection } from '../components/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 1, 2026">
      <p className="text-sm leading-relaxed text-muted">
        Team Pulse is a student software project built to manage tasks and communication inside
        small teams. This page explains, in plain terms, what information the application stores
        about you, why it is stored, and what control you have over it.
      </p>

      <LegalSection title="Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your name (first name and last name).</li>
          <li>Your email address, which is also used to sign in.</li>
          <li>An avatar image URL, if you choose to add one.</li>
          <li>The tasks you create, are assigned to, or that belong to your teams.</li>
          <li>The chat messages you send inside a workspace.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Why we collect it">
        Your name, email and avatar are used to identify you to your teammates and to let you sign
        in to your account. Your tasks power the task board, dashboard and reporting features. Your
        chat messages exist so the chat feature can deliver them to the right workspace. None of
        this information is used for advertising, and none of it is sold or shared with third
        parties.
      </LegalSection>

      <LegalSection title="Where your data lives">
        Everything described above is stored in this project's own PostgreSQL database, run as
        part of the application's backend. There is no external analytics service and no
        third-party data broker involved in running Team Pulse.
      </LegalSection>

      <LegalSection title="Your choices">
        From the Settings page, signed-in users can download a copy of everything stored about
        them (profile, teams and tasks) as a single file, at any time. From the same page, you can
        also permanently delete your account. Deleting your account removes your access immediately
        and cannot be undone.
      </LegalSection>

      <LegalSection title="Contact">
        This project does not run a support desk or a dedicated contact address. If you have a
        question about your own data, the export and delete tools in Settings are the fastest way
        to see or remove exactly what is stored about you.
      </LegalSection>

      <LegalSection title="Changes to this policy">
        If this policy changes, the last updated date at the top of this page will change with it.
      </LegalSection>
    </LegalPage>
  );
}
