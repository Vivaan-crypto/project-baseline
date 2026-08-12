import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/app/_components/marketing-header";

/**
 * The privacy policy, rendered as a page rather than parsed from a markdown
 * file at build time. Two reasons: it avoids a markdown dependency in a repo
 * that keeps its dependency count deliberately low (AGENTS.md §12), and it
 * keeps exactly one copy of a legal document in the tree. A `.md` source
 * alongside a rendered page is two copies that drift, and the one people
 * actually read would be the one that fell behind.
 *
 * Accuracy here is load-bearing. Every claim below is a statement about code
 * elsewhere in this repo, so anything that changes what leaves the browser —
 * a new form field, another `track()` call, a different store — makes this
 * page wrong until it is updated in the same commit:
 *   - the field list in app/_components/signup-form.tsx
 *   - the sheet columns in lib/signups.ts and docs/EMAIL_CAPTURE.md
 *   - the <Analytics /> and <SpeedInsights /> tags in app/layout.tsx
 */

const LAST_UPDATED = "12 August 2026";

/** The one address a data request can arrive at. Deliberately not obfuscated:
 *  a contact that a rights request can't reach defeats the section it sits in. */
const CONTACT_EMAIL = "shahvivaan15@gmail.com";

export const metadata: Metadata = {
  title: "Privacy Policy — Baseline",
  description:
    "What this website collects, where it goes, and how to have it removed. One email address, two names, and cookieless traffic measurement.",
};

/**
 * A link to the landing page rather than `history.back()`. This page is linked
 * from the footer, but it is also the sort of URL that gets opened cold — from
 * a search result, a bookmark, or a link someone pasted — and in those cases
 * there is no previous page in the tab's history to return to, so a back()
 * button would do nothing at all. The browser's own back button already covers
 * the case where history exists; this one always resolves somewhere.
 */
function BackLink() {
  return (
    <Link
      href="/"
      className="press shrink-0 border-[3px] border-border bg-card px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-foreground shadow-[var(--shadow-sm)] hover:bg-lime hover:text-on-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
    >
      <span aria-hidden="true">←</span> Back
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border py-8">
      <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-muted">
        {title}
      </h2>
      <div className="flex flex-col gap-4 leading-relaxed">{children}</div>
    </section>
  );
}

function MailLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="font-mono font-bold text-cobalt underline underline-offset-4"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

function Outbound({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cobalt underline underline-offset-4"
    >
      {children}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <MarketingHeader right={<BackLink />} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-20 sm:px-8">
        {/* max-w-4xl above matches the header and the landing page, so the left
          edge lines up with the logo. The inner max-w-2xl keeps the measure
          readable instead of running prose the full width of that column. */}
        <div className="max-w-2xl">
          <header className="py-16 sm:py-20">
            <p className="mb-5 font-mono text-xs uppercase tracking-widest text-muted">
              Legal
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-6 font-mono text-xs uppercase tracking-wide text-muted">
              Last updated: {LAST_UPDATED}
            </p>
            <p className="mt-6 leading-relaxed text-muted">
              This policy covers this website only. Baseline the application
              does not exist yet — there is nothing to download and no software
              collecting anything about you. When there is, this page will be
              rewritten before it ships.
            </p>
          </header>

          <Section title="Who runs this">
            <p>
              Baseline is a personal project run by one individual, not a
              company. There is no team, no investor, and no third party with an
              interest in your data.
            </p>
          </Section>

          <Section title="What is collected">
            <p>
              Your first name, last name, and email address, if you type them
              into the signup form and submit it.
            </p>
            <p>Alongside them, two pieces of context are stored:</p>
            <ul className="flex flex-col gap-2 pl-5">
              <li className="list-disc">The time you submitted the form</li>
              <li className="list-disc">
                Which form you used — the one at the top of the page or the one
                at the bottom
              </li>
            </ul>
            <p>
              That second field exists so I can tell whether people sign up
              before or after reading the section describing what the
              application would capture. It tells me nothing about you
              personally.
            </p>
            <p>
              Beyond that and the traffic measurement described below, nothing
              is collected. There is no account, no password, no payment
              information, and no advertising or cross-site tracking cookie on
              this site.
            </p>
          </Section>

          <Section title="Traffic and speed measurement">
            <p>
              This site measures its own traffic and loading speed using Vercel
              Web Analytics and Vercel Speed Insights. Both are cookieless.
              Neither assigns you a visitor identifier, and neither can follow
              you to any other site.
            </p>
            <p>
              What they record is which page was viewed, coarse technical
              context such as country, browser, and device type, and how quickly
              the page rendered for you.
            </p>
            <p>
              Three things the signup form does are also counted: that the
              button was pressed, that a submission succeeded, and that one
              failed together with a short category for why — a malformed
              address, say, or the storage endpoint being unreachable. These
              record that something happened and which of the two forms it
              happened on. They never include anything you typed.
            </p>
          </Section>

          <Section title="Where it goes">
            <p>
              Submitted names and addresses are stored in a private Google
              Sheet. Google processes and stores that data under its own terms,
              which you can read at{" "}
              <Outbound href="https://policies.google.com/privacy">
                policies.google.com/privacy
              </Outbound>
              .
            </p>
            <p>
              The site itself is hosted on Vercel. Like any web host, Vercel’s
              infrastructure logs standard request data — IP address, browser
              type, page requested, timestamp — as a normal part of serving
              pages. That is Vercel’s logging, not something added here, and it
              is covered by{" "}
              <Outbound href="https://vercel.com/legal/privacy-policy">
                vercel.com/legal/privacy-policy
              </Outbound>
              .
            </p>
            <p>
              Your details are not sold, rented, shared, or given to anyone
              else.
            </p>
          </Section>

          <Section title="What it is used for">
            <p>
              One purpose: emailing you about Baseline. Progress updates, and a
              message when there is something to install.
            </p>
            <p>
              It will not be used for anything else, added to any other list, or
              used to contact you about an unrelated project.
            </p>
          </Section>

          <Section title="How long it is kept">
            <p>
              Until you ask for it to be removed, or until the project is
              abandoned — whichever comes first. If Baseline is abandoned, the
              sheet is deleted.
            </p>
          </Section>

          <Section title="Your choices">
            <p>
              Email <MailLink /> and your details will be removed from the
              sheet. No explanation needed, no confirmation flow, no attempt to
              talk you out of it.
            </p>
            <p>
              You can also ask what is stored about you, and the answer will be
              your name, your address, the timestamp, and the form location.
            </p>
            <p>
              Depending on where you live you may have additional rights over
              your data — access, correction, deletion, portability, or
              objection — under the GDPR, the UK GDPR, the CCPA, or similar
              laws. Those requests go to the same address and will be honoured.
            </p>
          </Section>

          <Section title="Security">
            <p>
              The sheet is private and tied to a single Google account with
              two-factor authentication enabled. That is a reasonable measure
              for an email list, but no system is guaranteed secure, and it
              would be dishonest to claim otherwise.
            </p>
            <p>
              Given that the only thing stored is a name and an email address
              you already chose to hand over, the consequences of a failure here
              are small.
            </p>
          </Section>

          <Section title="Children">
            <p>
              This site is not aimed at anyone under 16 and no address is
              knowingly collected from anyone under that age.
            </p>
          </Section>

          <Section title="About the application">
            <p>
              For clarity, since the site describes software that does not exist
              yet:
            </p>
            <p>
              Baseline is planned as a desktop application that runs entirely on
              your own computer. As designed, it would write data to a file on
              your disk and read it back locally. It would not upload anything,
              and there would be no server to receive it. That is a description
              of the intended design, not a commitment about a finished product,
              and this policy will be replaced with one covering the actual
              software before any build is released.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If this policy changes, the date at the top changes. If it changes
              in a way that affects what happens to details already on the list,
              everyone on the list gets an email about it before it takes
              effect.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              <MailLink />
            </p>
          </Section>
        </div>
      </main>
    </>
  );
}
