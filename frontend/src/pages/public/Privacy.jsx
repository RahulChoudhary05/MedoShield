import { Link } from 'react-router-dom'
import LegalPage from '../../features/info/LegalPage'
import { CREATOR } from '../../seo/site'

const UPDATED = { iso: '2026-11-07', label: '7 November 2026' }

const ext = { target: '_blank', rel: 'noopener noreferrer' }

const SECTIONS = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>
          MedoShield AI is a privacy-first neuro-motor monitoring app designed and built by {CREATOR.name}, an
          independent developer in India. This policy explains, in plain language, what the app collects, where it goes,
          who can see it and how you remove it. It covers the website and the web app at medoshield.pages.dev.
        </p>
        <p>
          MedoShield is a monitoring and education tool. It is not a medical device and does not diagnose any condition.
        </p>
      </>
    ),
  },
  {
    id: 'movement',
    title: 'Movement checks stay on your device',
    body: (
      <>
        <p>
          When you take a movement check, your camera feed is processed inside your browser using MediaPipe pose
          estimation. The model finds 33 body landmarks in each frame. The video itself is never uploaded, recorded or
          stored by us for a movement check.
        </p>
        <p>What is sent to our server is:</p>
        <ul>
          <li>the landmark coordinates for each frame (numbers describing joint positions, not images);</li>
          <li>metrics derived from them, such as tremor frequency in the 4–12 Hz band, gait cadence and left/right symmetry, and balance sway;</li>
          <li>a signal-quality score, the check type and the time it was taken.</li>
        </ul>
        <p>
          These are stored so we can build your personal baseline from your first five sessions and show how later checks
          compare with it.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'What else we store',
    body: (
      <>
        <h3>Account details</h3>
        <p>
          Your name, email address and role. Patients may optionally add a date of birth and gender. Clinicians provide a
          medical registration number, specialty and, optionally, a clinic name and consultation fee.
        </p>
        <h3>Things you add</h3>
        <p>
          Medication plans and logs, wellbeing and fitness records, appointment requests, messages with your clinician,
          SOS alerts you raise, and conversations with the AI assistant.
        </p>
        <h3>Lab reports</h3>
        <p>
          When you ask for a lab report explanation, the text is extracted from the PDF and sent to the AI provider. We
          keep the file name and the resulting explanation, not the PDF itself.
        </p>
        <h3>Security logs</h3>
        <p>
          For sign-ins and sensitive actions (such as exporting or deleting data) we keep an audit entry with the action,
          time, IP address and a shortened browser user-agent string, so misuse can be detected and investigated.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI features and third-party processing',
    body: (
      <>
        <p>Some optional features send data to external AI providers. They are processed only to give you the answer you asked for.</p>
        <ul>
          <li>
            <strong>AI assistant.</strong> Your messages are processed by Groq, with Google Gemini as a fallback if Groq is
            unavailable. Requests pass through guardrails that keep answers within health education and steer urgent
            symptoms towards emergency care.
          </li>
          <li>
            <strong>AI video review.</strong> If a clinician you are connected with enables video review for you, a short clip
            you choose to upload is sent to Google Gemini for analysis. Our server handles the clip in memory and discards
            it; only the structured result is stored.
          </li>
          <li><strong>Lab report explanations.</strong> Extracted report text is processed in the same way as assistant messages.</li>
        </ul>
        <p>
          We do not use your data for advertising, and we do not sell it. These providers process data under their own
          terms for API customers; please avoid sharing details in the assistant that you do not want processed.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who can see your data',
    body: (
      <>
        <p>
          You do. A clinician can see your checks, trends and shared records only after you send them a request and they
          accept it. You can end that connection at any time, after which they no longer see new data.
        </p>
        <p>
          Messages and files you exchange with a clinician (chat media such as images or documents) are stored in our
          database so both of you can see the conversation.
        </p>
        <p>We do not share your data with employers, insurers, advertisers or data brokers.</p>
      </>
    ),
  },
  {
    id: 'storage',
    title: 'Where data lives and how it is protected',
    body: (
      <>
        <ul>
          <li>The app is served from Cloudflare Pages; the API runs on Render.</li>
          <li>Data is stored in MongoDB Atlas, including chat media.</li>
          <li>All traffic is encrypted in transit with TLS.</li>
          <li>Passwords are hashed with Argon2id; we never store or see them in plain text.</li>
          <li>
            Sessions use a short-lived access token (about 15 minutes) held in memory, renewed through an httpOnly, secure
            cookie that page scripts cannot read.
          </li>
          <li>Uploads are size-limited and type-checked, and requests are rate-limited.</li>
        </ul>
        <p>
          No system is perfectly secure. If we learn of a breach that affects your data, we will tell affected users as
          soon as we reasonably can.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and analytics',
    body: (
      <>
        <p>
          We use one essential cookie: the httpOnly session cookie that keeps you signed in. There are no advertising or
          tracking cookies.
        </p>
        <p>
          To understand overall traffic we use Cloudflare Web Analytics, which is cookieless and does not build a profile of
          you across sites.
        </p>
      </>
    ),
  },
  {
    id: 'control',
    title: 'Your choices and rights',
    body: (
      <>
        <ul>
          <li><strong>Access and export.</strong> Patients can download a copy of their data as a JSON file from Settings.</li>
          <li><strong>Correct.</strong> You can edit your profile details in Settings.</li>
          <li>
            <strong>Delete.</strong> Patients can permanently delete their account from Settings after confirming their
            password. This removes your profile, checks, baselines, assessments, reports, assistant conversations,
            medications, wellbeing records, messages, chat media, care connections and alerts, and signs out every session.
            Security audit entries are kept.
          </li>
          <li><strong>Revoke access.</strong> End a clinician connection at any time.</li>
        </ul>
        <p>
          Depending on where you live, you may have further rights under laws such as India’s Digital Personal Data
          Protection Act, 2023. Contact us using the details below to exercise them.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep data',
    body: (
      <p>
        We keep your data for as long as your account exists, because trends and baselines need history. When you delete
        your account, the data listed above is removed from the live database straight away.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        MedoShield is meant for adults. If you are under 18, please use it only with a parent, guardian or clinician
        involved.
      </p>
    ),
  },
  {
    id: 'medical',
    title: 'Not a medical device',
    body: (
      <p>
        Results are for monitoring and education and can be wrong. They do not replace assessment by a qualified clinician.
        In an emergency, call <strong>112</strong> (or <strong>108</strong> for an ambulance in India) — do not rely on the
        app or the SOS button alone. See the <Link to="/terms">terms of use</Link> for more.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we change how data is handled, we will update this page and the date at the top. For significant changes we will also
        try to give notice in the app.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions or requests about privacy can be raised through the project on GitHub:{' '}
        <a href="https://github.com/RahulChoudhary05/MedoShield/issues" {...ext}>the MedoShield GitHub repository</a>. Please do not post personal health details in a
        public issue — ask for a private contact instead.
      </p>
    ),
  },
]

export default function Privacy() {
  return (
    <LegalPage
      kicker="Legal · privacy"
      title="Privacy policy"
      lede="Your video never leaves your device for a movement check. Here is exactly what we store, why, and how you control it."
      updated={UPDATED}
      summary={[
        'Pose tracking runs in your browser; only landmark coordinates and derived metrics are sent.',
        'Clinicians see your data only after you request them and they accept.',
        'Optional AI features use Groq and Google Gemini; nothing is used for ads or sold.',
        'You can export or delete your data from Settings at any time.',
      ]}
      sections={SECTIONS}
    />
  )
}
