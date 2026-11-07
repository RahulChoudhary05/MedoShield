import { Link } from 'react-router-dom'
import LegalPage from '../../features/info/LegalPage'
import { CREATOR } from '../../seo/site'

const UPDATED = { iso: '2026-11-07', label: '7 November 2026' }

const SECTIONS = [
  {
    id: 'agreement',
    title: 'About these terms',
    body: (
      <>
        <p>
          These terms apply when you use MedoShield AI, the website and web app designed and built by {CREATOR.name}. By
          creating an account or using the app you agree to them. If you do not agree, please do not use MedoShield.
        </p>
        <p>
          How we handle your data is described in the <Link to="/privacy">privacy policy</Link>, which forms part of these terms.
        </p>
      </>
    ),
  },
  {
    id: 'not-medical',
    title: 'Not a medical device',
    body: (
      <>
        <p>
          MedoShield is a monitoring and education tool. It measures movement signals — tremor in the 4–12 Hz band, gait
          cadence and symmetry, balance sway — and compares them with your own baseline. It does <strong>not</strong>{' '}
          diagnose, treat, cure or prevent any disease, and it has not been approved or certified as a medical device by
          any regulator.
        </p>
        <ul>
          <li>Do not start, stop or change any treatment or medication based only on MedoShield.</li>
          <li>Always discuss results with a qualified clinician.</li>
          <li>A “stable” result does not mean nothing is wrong; a flagged result does not mean something is.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'emergencies',
    title: 'Emergencies',
    body: (
      <p>
        MedoShield is not an emergency service. If you or someone else may be in danger, call <strong>112</strong> (or{' '}
        <strong>108</strong> for an ambulance in India) straight away. The in-app SOS feature can notify connected
        clinicians, but delivery and response are not guaranteed.
      </p>
    ),
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: (
      <ul>
        <li>Give accurate information and keep your password private. You are responsible for activity under your account.</li>
        <li>MedoShield is meant for adults; anyone under 18 should use it only with a parent, guardian or clinician involved.</li>
        <li>Tell us promptly if you think someone else has accessed your account.</li>
      </ul>
    ),
  },
  {
    id: 'clinicians',
    title: 'Additional terms for clinicians',
    body: (
      <>
        <ul>
          <li>You must be a registered practitioner and provide a genuine registration number. A “verified” badge is shown only after our team has checked it.</li>
          <li>You may access a patient’s data only after they send you a request and you accept it, and only to support their care.</li>
          <li>Measurements and AI summaries are aids. Clinical judgement and decisions remain yours.</li>
          <li>You remain responsible for meeting your own professional, ethical and legal duties, including record-keeping.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI-generated content',
    body: (
      <p>
        The assistant, lab report explanations and video review are produced by AI models (Groq and Google Gemini) behind
        guardrails. AI output can be incomplete or wrong, even when it sounds confident. Treat it as general information to
        discuss with your clinician, never as a diagnosis or prescription.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>Please do not:</p>
        <ul>
          <li>use MedoShield for anyone without their permission, or upload content you have no right to share;</li>
          <li>try to access another person’s account or data, or get around access controls or rate limits;</li>
          <li>probe, scan or attack the service, or interfere with how it runs;</li>
          <li>use the AI features to produce harmful, unlawful or abusive content;</li>
          <li>harass clinicians or patients through messaging.</li>
        </ul>
        <p>We may suspend or close accounts that break these rules.</p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    body: (
      <p>
        MedoShield is provided free of charge and “as is”. Features may change, and the service may occasionally be slow
        or unavailable — for example while the server wakes up or during maintenance. We do not promise uninterrupted
        access, so do not rely on the app as your only record of important health information; patients can export their
        data from Settings at any time.
      </p>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your use',
    body: (
      <p>
        You can stop using MedoShield whenever you like. Patients can permanently delete their account and data from
        Settings, as described in the <Link to="/privacy#control">privacy policy</Link>.
      </p>
    ),
  },
  {
    id: 'ip',
    title: 'Ownership',
    body: (
      <p>
        You keep ownership of the data you add. You allow us to store and process it only to run the features you use.
        The MedoShield name, design and software belong to {CREATOR.name}.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the extent the law allows, MedoShield and its creator are not liable for indirect or consequential loss, or for
        decisions made on the basis of the app’s measurements or AI output. Nothing in these terms limits rights you have
        under consumer protection law that cannot be excluded.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: <p>These terms are governed by the laws of India.</p>,
  },
  {
    id: 'contact',
    title: 'Changes and contact',
    body: (
      <p>
        We may update these terms; the date at the top shows the latest version, and continuing to use MedoShield means you
        accept the update. Questions can be raised through the project on GitHub:{' '}
        <a href="https://github.com/RahulChoudhary05/MedoShield/issues" target="_blank" rel="noopener noreferrer">the MedoShield GitHub repository</a>.
      </p>
    ),
  },
]

export default function Terms() {
  return (
    <LegalPage
      kicker="Legal · terms"
      title="Terms of use"
      lede="MedoShield AI is a monitoring and education tool, not a diagnostic device. These are the ground rules for using it."
      updated={UPDATED}
      summary={[
        'MedoShield supports, but never replaces, a qualified clinician.',
        'In an emergency call 112 or 108 — the app is not an emergency service.',
        'Clinicians see a patient only after the patient requests them and they accept.',
        'Free and provided as is; you can delete your account at any time.',
      ]}
      sections={SECTIONS}
    />
  )
}
