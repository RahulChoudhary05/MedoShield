/**
 * Content pages for search: feature pages, use-case pages, comparison pages and their hubs,
 * plus the referral and partner pages. Plain ESM (no JSX) so scripts/seo-build.mjs can import it
 * and prerender every page's <head>, JSON-LD and crawlable fallback HTML.
 *
 * Rules for this file (E-E-A-T + medical accuracy):
 * - Only claims the product actually makes: 33 pose landmarks, on-device tracking, 4–12 Hz tremor band,
 *   a personal baseline from the first five checks, a signal-quality gate, clinician sharing by consent.
 * - No invented statistics, testimonials, user counts or ratings. Not a diagnostic device — say so.
 * - `intro` answers the search query in two sentences. Titles + " · MedoShield AI" land at 50–60 characters.
 * - Bump `updated` whenever a page's substance changes (feeds dateModified and the sitemap).
 */

export const CONTENT_UPDATED = '2026-11-09'

const DISCLAIMER = 'MedoShield AI is a monitoring and education tool. It does not diagnose any condition and never replaces assessment by a qualified clinician.'

export const HUBS = [
  {
    path: '/features',
    kind: 'hub',
    title: 'Features: tremor, gait & balance checks',
    description: 'What a ten-second MedoShield check measures — tremor frequency, gait cadence and symmetry, balance sway — and how results reach your doctor.',
    heading: 'Everything a ten-second check measures',
    intro: 'MedoShield measures tremor, gait and balance from a phone camera, on your own device. Each feature below explains what is measured, how, and what it cannot tell you.',
    navLabel: 'Features',
  },
  {
    path: '/use-cases',
    kind: 'hub',
    title: 'Who MedoShield is for: patients & clinics',
    description: 'How people living with Parkinson’s or essential tremor, and the clinicians who care for them, use MedoShield between appointments.',
    heading: 'Who uses MedoShield, and for what',
    intro: 'MedoShield fills the months between neurology appointments with objective movement data. These pages describe the situations it was designed for.',
    navLabel: 'Use cases',
  },
  {
    path: '/compare',
    kind: 'hub',
    title: 'Compare movement monitoring methods',
    description: 'Honest comparisons of ways to track tremor and gait: phone camera vs wearable sensors, and home monitoring vs clinic visits alone.',
    heading: 'Ways to track movement, compared honestly',
    intro: 'There is no single best way to monitor tremor and gait. These comparisons set out where a phone-camera check helps, and where other methods are better.',
    navLabel: 'Comparisons',
  },
]

export const CONTENT_PAGES = [
  /* ───────────── Features ───────────── */
  {
    path: '/features/tremor-test',
    parent: '/features',
    kind: 'feature',
    title: 'Online tremor test with your phone camera',
    description: 'Measure rest and postural tremor frequency (4–12 Hz) with a ten-second phone-camera check. Pose tracking runs on your device; video never uploads.',
    heading: 'A tremor test you can take at home in ten seconds',
    intro: 'MedoShield’s tremor test uses your phone or laptop camera to track 33 body landmarks and measure how often your hands shake, in the 4–12 Hz band. It runs in your browser, compares each result with your own baseline, and never uploads the video.',
    sections: [
      {
        h: 'What the tremor test measures',
        p: ['During the check you rest your hands, then hold them out in front of you. MedoShield follows the wrist and finger landmarks frame by frame and turns their small movements into a frequency spectrum.'],
        list: [
          'Dominant tremor frequency, in hertz, within the 4–12 Hz band',
          'Relative tremor strength at rest and with arms held out (postural)',
          'Left/right difference, because many movement disorders start on one side',
        ],
      },
      {
        h: 'Why the 4–12 Hz band',
        p: ['Most clinically relevant tremors sit in this range. A typical phone camera records about 30 frames per second, which can resolve movements up to roughly 15 Hz, so the band is measurable without special hardware.'],
      },
      {
        h: 'Compared with your own normal, not a population average',
        p: ['Your first five checks build a personal baseline. After that, every result is shown as a change from your normal, so a steady tremor reads as steady and a real change stands out.'],
      },
      {
        h: 'What it cannot tell you',
        p: ['A tremor test cannot say why a tremor happens or name a condition. Recordings that are too dark, too shaky or partly out of frame are rejected by a signal-quality gate rather than scored. ' + DISCLAIMER],
      },
    ],
    faq: [
      ['Can I test my tremor online without an app?', 'Yes. MedoShield runs in a modern mobile or desktop browser; nothing needs to be installed.'],
      ['Is my video uploaded?', 'No. Pose tracking runs on your device and only the 33 landmark coordinates per frame are sent for analysis.'],
      ['How often should I test?', 'Daily or a few times a week at a similar time of day gives the most useful trend. Note when you took medication, as it affects tremor.'],
    ],
    related: ['/features/gait-analysis', '/use-cases/essential-tremor', '/compare/phone-camera-vs-wearables'],
  },
  {
    path: '/features/gait-analysis',
    parent: '/features',
    kind: 'feature',
    title: 'Gait analysis app: cadence & symmetry',
    description: 'Track walking cadence and left/right step symmetry from a short phone video. On-device pose tracking, personal baseline, trends your doctor can see.',
    heading: 'Gait analysis from a short walk in front of your phone',
    intro: 'MedoShield’s gait analysis measures your walking cadence and how evenly your left and right sides move, from a short walk filmed on your phone. Results are tracked against your personal baseline over weeks, not judged from a single walk.',
    sections: [
      {
        h: 'What gait analysis measures',
        list: [
          'Cadence — steps per minute',
          'Left/right symmetry of step timing and leg movement',
          'Arm-swing difference between sides, where the camera can see both arms',
        ],
      },
      {
        h: 'How to record a useful walk',
        p: ['Prop the phone at hip height, step back until your whole body is in view, and walk naturally across the frame for 10–30 seconds. Good light and a clear floor matter more than the phone model.'],
      },
      {
        h: 'Why trends matter more than one walk',
        p: ['Walking changes with sleep, pain, footwear and medication timing. A single number says little; a month of checks against your own baseline shows whether something is genuinely shifting.'],
      },
      { h: 'Limits', p: ['Camera-based gait analysis is not a gait lab. It does not measure forces or joint angles precisely. ' + DISCLAIMER] },
    ],
    faq: [
      ['Do I need a treadmill or sensors?', 'No. A phone or laptop camera and a few metres of floor are enough.'],
      ['Can my physiotherapist see the results?', 'If you connect with them as your clinician in MedoShield, they see your trend. You can revoke access at any time.'],
    ],
    related: ['/features/balance-assessment', '/use-cases/parkinsons-monitoring', '/compare/home-monitoring-vs-clinic-visits'],
  },
  {
    path: '/features/balance-assessment',
    parent: '/features',
    kind: 'feature',
    title: 'Balance assessment at home with a phone',
    description: 'A quick standing-balance check that measures postural sway with your phone camera, compared with your own baseline and shared with your clinician.',
    heading: 'A standing balance check, measured instead of guessed',
    intro: 'MedoShield’s balance assessment asks you to stand still for a few seconds while the camera tracks how much your body sways. The sway is measured, compared with your own baseline and added to the trend your clinician can review.',
    sections: [
      {
        h: 'What is measured',
        list: ['Postural sway — how far and how often the upper body drifts while standing', 'Side-to-side asymmetry in stance', 'Change from your personal baseline over time'],
      },
      {
        h: 'Safety first',
        p: ['Stand next to a wall, sturdy chair or another person while you take the check. Stop at once if you feel unsteady. Never take a balance check alone if you have fallen recently.'],
      },
      { h: 'Limits', p: ['A camera sees body landmarks, not the forces under your feet that a clinical force plate measures. ' + DISCLAIMER] },
    ],
    faq: [
      ['Is a balance check safe to do alone?', 'Only if you are normally steady. Always have support within reach, and skip it if you have fallen recently.'],
    ],
    related: ['/features/gait-analysis', '/use-cases/parkinsons-monitoring'],
  },

  /* ───────────── Use cases ───────────── */
  {
    path: '/use-cases/parkinsons-monitoring',
    parent: '/use-cases',
    kind: 'use-case',
    title: 'Parkinson’s symptom tracking at home',
    description: 'Track Parkinson’s tremor, walking and balance between neurology visits with ten-second phone checks, medication logs and a trend your doctor can see.',
    heading: 'Tracking Parkinson’s symptoms between appointments',
    intro: 'MedoShield helps people living with Parkinson’s record tremor, walking and balance at home in ten seconds a day. Alongside medication logs, it turns the months between neurology visits into a trend your doctor can actually read.',
    sections: [
      {
        h: 'The problem it solves',
        p: ['A neurology appointment is a short snapshot, often months apart, and symptoms vary through the day with medication timing. Memory and diaries miss a lot of that.'],
      },
      {
        h: 'What a typical week looks like',
        list: [
          'A ten-second movement check each day, ideally at a similar time',
          'Medication doses logged with one tap, with reminders on your phone',
          'Sleep, stress and walking distance noted in under a minute',
          'Your clinician reviews the trend and any flagged checks before your visit',
        ],
      },
      {
        h: 'What it does not do',
        p: ['MedoShield does not diagnose Parkinson’s, rate disease stage or recommend medication changes. Its medicine guidance only screens over-the-counter options against your allergies and current medicines. ' + DISCLAIMER],
      },
    ],
    faq: [
      ['Can MedoShield tell if I have Parkinson’s?', 'No. It measures movement and shows change over time. Only a clinician can diagnose Parkinson’s.'],
      ['Does it help with on/off periods?', 'Logging doses next to checks lets you and your doctor see how movement changes around medication times.'],
    ],
    related: ['/features/tremor-test', '/features/gait-analysis', '/compare/home-monitoring-vs-clinic-visits'],
  },
  {
    path: '/use-cases/essential-tremor',
    parent: '/use-cases',
    kind: 'use-case',
    title: 'Essential tremor tracking with a phone',
    description: 'Measure essential tremor at rest and with arms outstretched, see how it changes with sleep, stress and caffeine, and share the trend with your doctor.',
    heading: 'Keeping a measured record of essential tremor',
    intro: 'Essential tremor mostly shows up when you use or hold out your hands, and it varies with stress, caffeine and fatigue. MedoShield measures it in ten seconds and lines it up with your daily notes so the pattern becomes visible.',
    sections: [
      {
        h: 'Why measure instead of describe',
        p: ['“A bit worse lately” is hard for anyone to act on. A frequency and strength reading compared with your own baseline makes a change concrete, and makes stable weeks visible too.'],
      },
      {
        h: 'Spotting your own triggers',
        list: ['Log sleep and stress alongside each check', 'Note caffeine or alcohol in the daily check-in', 'Compare checks before and after a treatment change your doctor made'],
      },
      { h: 'Limits', p: [DISCLAIMER] },
    ],
    faq: [['Can a phone tell essential tremor from Parkinson’s tremor?', 'No. Tremor type is a clinical judgement. MedoShield records frequency, strength and context for your clinician to interpret.']],
    related: ['/features/tremor-test', '/compare/phone-camera-vs-wearables'],
  },
  {
    path: '/use-cases/remote-patient-monitoring',
    parent: '/use-cases',
    kind: 'use-case',
    title: 'Remote patient monitoring for neurology',
    description: 'Clinicians see each patient’s tremor, gait and balance trend between visits, with flagged checks, AI summaries and secure messaging. Free to join.',
    heading: 'Remote monitoring for movement disorder clinics',
    intro: 'MedoShield gives neurologists and physiotherapists an objective movement trend for each patient between visits. Patients run ten-second checks at home; you review a triaged panel, flagged changes and a summary before the appointment.',
    sections: [
      {
        h: 'What you see',
        list: [
          'A patient panel sorted by latest risk level, with search, filters and CSV export',
          'Per-patient trends for tremor, gait and balance against that patient’s own baseline',
          'Medication adherence over the last 14 days',
          'Secure messaging and appointment requests in one place',
        ],
      },
      {
        h: 'Consent built in',
        p: ['Patients choose which clinician can see their data by sending an appointment request. They can revoke access at any time, and video review stays locked unless they unlock it.'],
      },
      { h: 'Limits', p: ['Results are decision support, not a diagnosis. Scores are relative to each patient’s baseline and gated on signal quality. ' + DISCLAIMER] },
    ],
    faq: [['Does it integrate with my EHR?', 'Not yet. You can export your patient list as a CSV file from the patients table.']],
    related: ['/compare/home-monitoring-vs-clinic-visits', '/features/gait-analysis'],
    cta: { label: 'Join as a clinician', to: '/join/doctor' },
  },

  /* ───────────── Comparisons ───────────── */
  {
    path: '/compare/phone-camera-vs-wearables',
    parent: '/compare',
    kind: 'compare',
    title: 'Phone camera vs wearables for tremor',
    description: 'Phone-camera checks vs wrist-worn sensors for tracking tremor and gait: what each measures well, cost, effort and privacy, compared honestly.',
    heading: 'Phone camera or wearable sensor: which suits tremor tracking?',
    intro: 'Wearable sensors record movement continuously but need a device on your body all day. A phone-camera check needs no hardware and captures a consistent ten-second snapshot. Many people are best served by one, some by both.',
    table: {
      columns: ['', 'Phone-camera check (MedoShield)', 'Wrist-worn wearable'],
      rows: [
        ['Hardware', 'The phone or laptop you have', 'A dedicated sensor or watch'],
        ['When it measures', 'Short checks you choose to take', 'Continuously while worn'],
        ['Tremor frequency', '4–12 Hz at ~30 fps', 'Higher sample rates, finer detail'],
        ['Gait and balance', 'Whole-body landmarks in view', 'Mostly one limb, unless several are worn'],
        ['Privacy', 'Video stays on device; landmarks only', 'Depends on the vendor'],
        ['Effort', 'Ten seconds, a few times a week', 'Wear and charge every day'],
      ],
    },
    sections: [
      { h: 'When a wearable is the better choice', p: ['If you need to capture symptoms that come and go through the day, or during sleep, a continuously worn sensor sees what a short check cannot.'] },
      { h: 'When a phone check is the better choice', p: ['If you want a consistent, comparable measurement without buying or wearing anything — and want whole-body gait and balance, not just one wrist — a short camera check is simpler to keep up.'] },
      { h: 'Using both', p: ['Nothing stops you combining them. Share both with your clinician and note in your daily check-in when you took each measurement.'] },
    ],
    faq: [['Is a phone camera accurate enough?', 'For tracking change against your own baseline in the 4–12 Hz band, yes. For precise clinical measurement, a clinic assessment remains the reference.']],
    related: ['/features/tremor-test', '/compare/home-monitoring-vs-clinic-visits'],
  },
  {
    path: '/compare/home-monitoring-vs-clinic-visits',
    parent: '/compare',
    kind: 'compare',
    title: 'Home monitoring vs clinic visits alone',
    description: 'What regular at-home movement checks add to periodic neurology appointments, and what only an in-person clinical examination can provide.',
    heading: 'Home monitoring and clinic visits do different jobs',
    intro: 'A clinic visit gives an expert, in-depth examination a few times a year. Home monitoring gives frequent, lighter measurements in everyday conditions. Together they show both depth and trend.',
    table: {
      columns: ['', 'At-home checks', 'Clinic visit'],
      rows: [
        ['Frequency', 'Daily or weekly', 'Every few months'],
        ['Depth', 'Tremor, gait, balance metrics', 'Full neurological examination'],
        ['Conditions', 'Your normal day, at home', 'One moment, in clinic'],
        ['Who interprets', 'Trends for you and your clinician', 'Your clinician, in person'],
        ['Can diagnose', 'No', 'Yes'],
      ],
    },
    sections: [
      { h: 'What home checks add', p: ['They show how movement changes with medication timing, sleep and stress, and they catch gradual drift that is easy to miss between visits.'] },
      { h: 'What only a clinic visit provides', p: ['Diagnosis, examination of rigidity and reflexes, medication decisions and everything that needs a trained clinician in the room. ' + DISCLAIMER] },
    ],
    faq: [['Should I skip appointments if my trend is stable?', 'No. Keep every appointment your clinician recommends. A stable trend is useful information for that visit, not a replacement for it.']],
    related: ['/use-cases/parkinsons-monitoring', '/use-cases/remote-patient-monitoring'],
  },
]

/** Growth pages: referral (people) and partners (organisations). Honest: no rewards are promised. */
export const GROWTH_PAGES = [
  {
    path: '/refer',
    kind: 'refer',
    title: 'Invite family, friends or your clinician',
    description: 'Share MedoShield with a family member, friend or clinician. Free for patients, private by design — send a personal link in one tap.',
    heading: 'Know someone who should be tracking their movement?',
    intro: 'MedoShield is free for patients, so the best way to help it grow is to share it with someone it could help — a parent, a friend or their clinician. Copy your link or share it in one tap.',
    sections: [
      { h: 'Who to invite', list: ['A family member living with tremor or Parkinson’s', 'A carer who helps someone keep track of symptoms', 'A neurologist or physiotherapist who might use the clinician view'] },
      { h: 'What they get', p: ['A free account, a ten-second movement check that keeps their video on their own device, and a trend they can share with a clinician of their choice.'] },
      { h: 'What we do not do', p: ['We never contact the people you invite and never see who you shared the link with. The link only tells us that a sign-up came from a referral.'] },
    ],
  },
  {
    path: '/partners',
    kind: 'partners',
    title: 'Partner with MedoShield: clinics & groups',
    description: 'Clinics, patient support groups and researchers: bring privacy-first movement monitoring to the people you serve. Co-branded links and onboarding help.',
    heading: 'Bring MedoShield to the people you support',
    intro: 'Clinics, patient support groups and research teams can partner with MedoShield to offer free, privacy-first movement monitoring. Partners get a tracked invite link, onboarding help and a direct line to the builder.',
    sections: [
      {
        h: 'Who partners with us',
        list: ['Neurology and physiotherapy clinics running remote follow-up', 'Parkinson’s and tremor patient support groups', 'University and hospital research teams studying movement'],
      },
      {
        h: 'What partners get',
        list: ['A tracked invite link, so you can see how many people joined through you', 'Onboarding material for patients and staff', 'Priority input into the product roadmap'],
      },
      { h: 'Ground rules', p: ['Partners never get access to patient data through the partnership itself. A clinician sees a patient’s data only after that patient sends them a request. ' + DISCLAIMER] },
    ],
  },
]

export const ALL_CONTENT = [...HUBS, ...CONTENT_PAGES, ...GROWTH_PAGES]

export const childrenOf = (hubPath) => CONTENT_PAGES.filter((p) => p.parent === hubPath)
export const contentFor = (path) => ALL_CONTENT.find((p) => p.path === path)
