import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | LearnFi",
  description: "Learn how LearnFi collects, uses, stores, shares, and protects information.",
};

export default function PrivacyPage() {
  return (
    <main className="discover-shell">
      <header className="topbar">
        <Link className="wordmark" href="/">
          <span className="brand-mark">L<span>f</span></span>learnfi
        </Link>
        <Link className="button button-quiet" href="/">
          <ArrowLeft size={16} /> Back home
        </Link>
      </header>

      <article className="privacy-content">
        <div className="eyebrow muted-eyebrow">LEARNFI</div>
        <h1>Privacy <span className="serif-accent">Policy.</span></h1>
        <p className="privacy-intro">
          LearnFi (“LearnFi,” “we,” “our,” or “us”) is a learning network that helps engineers,
          developers, and technical builders discover tutors, explore different teaching styles,
          access educational content, track learning progress, and build a verifiable learning
          history.
        </p>

        <div className="privacy-sections">
          <section>
            <h2>1. Introduction</h2>
            <p>
              This Privacy Policy explains how LearnFi collects, uses, stores, shares, and protects
              information when you access our website, authenticate using X, use our learning
              features, connect a Solana wallet, or interact with our digital credentials.
            </p>
            <p>LearnFi is operated by <strong>[insert the legal name of the individual or entity operating LearnFi]</strong>.</p>
            <p>
              By using LearnFi, you acknowledge that your information will be processed as
              described in this policy. Where applicable law requires consent for a particular
              processing activity, we will seek that consent separately.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>2.1 Information from X</h3>
            <p>
              When you sign in using X, we receive the account information made available through
              the X authentication integration and the permissions you authorize. Depending on the
              provider response, this may include:
            </p>
            <ul>
              <li>Your X user ID, which we use to associate your X identity with your LearnFi account.</li>
              <li>Your X username and display name.</li>
              <li>Your profile image URL, where provided.</li>
              <li>Authentication and account-linking information required to maintain your session.</li>
            </ul>
            <p>
              Your LearnFi username is separate from your immutable X user ID and can be changed
              without changing the underlying account identity.
            </p>
            <p>
              We do not ask for your X password. Authentication is handled through the X and
              Supabase authentication integrations.
            </p>

            <h3>2.2 LearnFi Account and Profile Information</h3>
            <p>We collect information you provide or generate while using LearnFi, including:</p>
            <ul>
              <li>Your LearnFi username and display name.</li>
              <li>Your biography and profile information.</li>
              <li>Your learner or tutor role.</li>
              <li>Your subjects, areas of expertise, and teaching-style preferences.</li>
              <li>Your tutor profile, published tutorials, and other content you submit.</li>
            </ul>
            <p>
              Some profile and tutor information may be visible to other LearnFi users or the
              public, depending on the feature and your publication settings.
            </p>

            <h3>2.3 Learning and Engagement Information</h3>
            <p>To operate the learning network, we may process:</p>
            <ul>
              <li>Tutorials you start, access, or complete.</li>
              <li>Learning progress and completion timestamps.</li>
              <li>Quiz attempts and results.</li>
              <li>Learning activities, XP, achievements, and streaks.</li>
              <li>Reviews, ratings, comments, and feedback.</li>
              <li>Tutor profile views, tutorial engagement, follows, and saves where those features are used.</li>
              <li>Credential eligibility and achievement records.</li>
            </ul>
            <p>
              We use this information to provide learning features, maintain accurate progress
              records, calculate streaks, support tutor discovery, prevent duplicate or fraudulent
              activity, and establish legitimate reputation signals.
            </p>
            <p>
              We distinguish engagement from endorsement. Viewing a tutor does not automatically
              constitute a recommendation of that tutor.
            </p>

            <h3>2.4 Wallet and Blockchain Information</h3>
            <p>
              LearnFi supports Solana wallet authentication and blockchain-based learner and tutor
              credentials. When you connect and verify a wallet, we may process:
            </p>
            <ul>
              <li>Your public Solana wallet address.</li>
              <li>Wallet-signature verification results.</li>
              <li>Wallet-linking and verification records.</li>
              <li>Credential type, status, achievement identifier, and related metadata.</li>
              <li>Transaction signatures and public blockchain account information associated with credential operations.</li>
            </ul>
            <p>
              LearnFi does not need your wallet&apos;s private key or recovery phrase to verify a
              wallet signature. Never provide your private key or recovery phrase to LearnFi.
            </p>
            <p>
              Credential issuance may involve a public transaction on Solana Devnet. Blockchain
              transactions and account data can be visible to others through public blockchain
              infrastructure.
            </p>
            <p>
              We aim to use non-personal metadata hashes for on-chain credentials rather than
              placing unnecessary personal information directly on-chain.
            </p>

            <h3>2.5 Video and Educational Content</h3>
            <p>
              LearnFi uses Mux for video-related functionality. When you upload or watch
              educational videos, relevant information may include video files, titles,
              descriptions, upload identifiers, playback identifiers, processing status, and
              playback-related requests.
            </p>
            <p>
              Video uploads use Mux&apos;s direct-upload infrastructure. Video data is sent to Mux
              rather than being routed through the LearnFi application server.
            </p>
            <p>
              If you publish content as a tutor, that content may be accessible to other users
              according to its publication and access settings.
            </p>

            <h3>2.6 Technical and Usage Information</h3>
            <p>
              When you access LearnFi, our application and service providers may process technical
              information needed to operate, secure, and troubleshoot the service. Depending on
              the service involved, this may include:
            </p>
            <ul>
              <li>IP address and browser or device information.</li>
              <li>Authentication and session information.</li>
              <li>Request timestamps, error records, and operational logs.</li>
              <li>Security events and information needed to detect abuse.</li>
            </ul>
            <p>
              We do not claim to collect every category listed above in every session. The
              information processed depends on how you use LearnFi and the technical services
              involved.
            </p>
          </section>

          <section>
            <h2>3. How We Use Information</h2>
            <p>We use information for the following purposes:</p>
            <ol>
              <li><strong>Authentication and account management:</strong> authenticate users, maintain sessions, associate X identities with LearnFi accounts, and manage account profiles.</li>
              <li><strong>Learning services:</strong> deliver tutorials, maintain progress, record quiz results, calculate streaks, and support learning paths.</li>
              <li><strong>Tutor discovery:</strong> display tutor profiles, teaching styles, subjects, and relevant engagement or feedback signals.</li>
              <li><strong>Reputation and credentials:</strong> evaluate achievement eligibility, issue or revoke credentials where authorized, and verify credential records.</li>
              <li><strong>Video delivery:</strong> support uploads, processing, playback, and video-related service operations.</li>
              <li><strong>Security and integrity:</strong> detect abuse, prevent duplicate activity, enforce access rules, and protect users and the service.</li>
              <li><strong>Service improvement:</strong> diagnose failures, understand operational performance, and improve the functionality and reliability of LearnFi.</li>
              <li><strong>Legal compliance:</strong> comply with applicable laws and respond to valid legal requests.</li>
            </ol>
            <p>
              We do not use an X username as the sole permanent identifier for a user, because
              usernames can change.
            </p>
          </section>

          <section>
            <h2>4. Legal Bases for Processing</h2>
            <p>
              Where applicable data-protection law requires a legal basis, we rely on the basis
              appropriate to the activity, which may include:
            </p>
            <ul>
              <li>Performing a contract or taking steps necessary to provide a service you request.</li>
              <li>Your consent, where consent is required or appropriate.</li>
              <li>Our legitimate interests in operating, securing, and improving LearnFi, provided those interests do not override your applicable rights.</li>
              <li>Compliance with legal obligations.</li>
            </ul>
            <p>
              Where processing relies on consent, you may withdraw that consent subject to
              applicable law. Withdrawal does not make processing that occurred lawfully before
              withdrawal unlawful.
            </p>
          </section>

          <section>
            <h2>5. How Information Is Shared</h2>
            <p>LearnFi does not sell personal information as a business model.</p>
            <p>We may share or permit access to information in the following circumstances:</p>

            <h3>Service Providers</h3>
            <p>We use third-party providers to operate LearnFi, including:</p>
            <ul>
              <li><strong>X:</strong> for X account authentication and the provision of authorized account information.</li>
              <li><strong>Supabase:</strong> for authentication, database hosting, and application data services.</li>
              <li><strong>Mux:</strong> for video uploads, processing, and playback.</li>
              <li><strong>Vercel:</strong> for application hosting and deployment.</li>
              <li><strong>Solana infrastructure providers:</strong> to submit transactions and read public blockchain data when blockchain features are used.</li>
            </ul>
            <p>
              These providers process information according to their respective services,
              agreements, and privacy policies. Their processing may be subject to separate terms.
            </p>

            <h3>Public Profiles and User-Generated Content</h3>
            <p>
              Information you choose to publish, including tutor profiles, tutorials, comments,
              and reviews, may be visible to other users or the public.
            </p>

            <h3>Blockchain Transactions</h3>
            <p>
              Public Solana transactions and account data may be accessible to anyone using a
              blockchain explorer or other compatible infrastructure. We cannot guarantee that
              information recorded on a public blockchain can be made private or deleted.
            </p>

            <h3>Legal and Security Reasons</h3>
            <p>
              We may disclose information when reasonably necessary to comply with applicable law,
              respond to valid legal process, protect users, investigate abuse, or safeguard
              LearnFi&apos;s rights and security.
            </p>

            <h3>Business Transfers</h3>
            <p>
              If LearnFi undergoes a merger, acquisition, restructuring, or transfer of
              operations, relevant information may be transferred subject to applicable law and
              appropriate safeguards.
            </p>
          </section>

          <section>
            <h2>6. Cookies, Sessions, and Similar Technologies</h2>
            <p>
              LearnFi and its authentication or hosting providers may use cookies or similar
              technologies to maintain login sessions, protect authentication flows, preserve
              security, and support essential application functionality.
            </p>
            <p>
              If optional analytics or other non-essential tracking technologies are introduced,
              we will provide notices and obtain consent where required by applicable law.
            </p>
            <p>
              You can manage cookies through your browser settings. Blocking essential cookies may
              prevent sign-in or other features from working correctly.
            </p>
          </section>

          <section>
            <h2>7. Data Retention</h2>
            <p>
              We retain information for as long as reasonably necessary to provide LearnFi,
              maintain account and learning records, protect the service, resolve disputes, and
              comply with legal obligations.
            </p>
            <p>Retention periods vary by information type and purpose.</p>
            <p>
              When information is no longer required, we will take reasonable steps to delete it,
              anonymize it, or otherwise handle it in accordance with applicable law.
            </p>
            <p>
              Some records may need to be retained for security, fraud prevention, legal
              compliance, or legitimate recordkeeping purposes.
            </p>
            <p>
              Information recorded on a public blockchain may remain accessible indefinitely, even
              after we delete related off-chain information.
            </p>
          </section>

          <section>
            <h2>8. Your Privacy Rights</h2>
            <p>Depending on your location and applicable law, you may have the right to:</p>
            <ul>
              <li>Request access to personal information we hold about you.</li>
              <li>Request correction of inaccurate or incomplete information.</li>
              <li>Request deletion of personal information.</li>
              <li>Object to or request restriction of certain processing.</li>
              <li>Request a portable copy of eligible information.</li>
              <li>Withdraw consent where processing is based on consent.</li>
              <li>Complain to the relevant data-protection authority.</li>
            </ul>
            <p>We may need to verify your identity before acting on a request.</p>
            <p>We will respond within the time limits required by applicable law.</p>
          </section>

          <section>
            <h2>9. Account Deletion and Blockchain Limitations</h2>
            <p>You may request deletion of your LearnFi account and associated personal information.</p>
            <p>
              Where deletion is appropriate and legally permitted, we will take reasonable steps
              to delete or de-identify information held in our application databases and instruct
              relevant service providers as required by applicable obligations.
            </p>
            <p>
              Some records may be retained where required by law or reasonably necessary for
              security, dispute resolution, or other lawful purposes.
            </p>
            <p>Deleting an account does not necessarily delete:</p>
            <ul>
              <li>Public blockchain transactions or credential accounts.</li>
              <li>Copies of public content already accessed, copied, or independently stored by others.</li>
              <li>Information that must lawfully be retained.</li>
            </ul>
            <p>We will not represent an on-chain record as deleted when it remains present on the blockchain.</p>
          </section>

          <section>
            <h2>10. Data Security</h2>
            <p>
              We use reasonable technical and organizational measures designed to protect
              personal information against unauthorized access, alteration, disclosure, loss, and
              misuse.
            </p>
            <p>
              These measures may include access controls, server-side handling of secrets,
              authentication safeguards, database permissions, and appropriate validation of
              wallet signatures and credential operations.
            </p>
            <p>
              No internet-based service or storage system can be guaranteed to be completely
              secure. You are responsible for protecting access to your accounts and wallet
              credentials.
            </p>
            <p>LearnFi will handle personal-data incidents in accordance with applicable legal requirements.</p>
          </section>

          <section>
            <h2>11. International Data Transfers</h2>
            <p>
              LearnFi relies on third-party infrastructure that may process or store information
              in countries other than your country of residence.
            </p>
            <p>
              Where personal information is transferred internationally, we will take the steps
              required by applicable law to ensure appropriate safeguards for that transfer.
            </p>
            <p>
              The locations and processing arrangements may depend on the services and
              configuration used by LearnFi.
            </p>
          </section>

          <section>
            <h2>12. Children and Age Restrictions</h2>
            <p>LearnFi is intended for people learning technical skills and is not designed for children under 13.</p>
            <p>
              If we learn that we have collected personal information from a child below the
              applicable minimum age without a lawful basis or required authorization, we will
              take appropriate steps to address the situation.
            </p>
            <p>Where local law imposes a higher age threshold or additional requirements, those requirements apply.</p>
          </section>

          <section>
            <h2>13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy as LearnFi evolves, its features change, or legal
              requirements change.
            </p>
            <p>
              When we update it, we will revise the “Last updated” date and provide additional
              notice where required by applicable law.
            </p>
            <p>
              Your continued use of LearnFi after an update is subject to the revised policy to
              the extent permitted by law.
            </p>
          </section>
        </div>
      </article>

      <footer className="footer">
        <Link className="wordmark footer-brand" href="/">
          <span className="brand-mark">L<span>f</span></span>learnfi
        </Link>
        <span>Build a learning history that goes with you.</span>
        <span className="footer-status"><i /> BUILT FOR THE CURIOUS</span>
      </footer>
    </main>
  );
}
