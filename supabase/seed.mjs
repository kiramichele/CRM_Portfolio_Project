// ============================================================================
// ServiceHub — demo seed
// Creates demo auth users (via the Admin API, which handles password hashing
// and email confirmation) and a rich, interconnected dataset so the app looks
// alive on first load.
//
// Usage:
//   1. Apply the SQL migrations first (see supabase/README.md).
//   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (NOT the anon key).
//   3. node supabase/seed.mjs
//
// Idempotent: re-running wipes demo-owned data and recreates it.
// All demo accounts share the password below.
// ============================================================================

import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Load env from a file if present, so you don't have to export shell vars.
// Looks for these (first found wins per-variable), relative to where you run node.
for (const p of ['supabase/.env', '.env', '.env.local']) {
  if (existsSync(p) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(p)
    } catch {
      /* malformed file — ignore and fall back to real env */
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'ServiceHub!2026'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing required env vars:')
  if (!SUPABASE_URL) console.error('  - SUPABASE_URL')
  if (!SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error(
    '\nEasiest fix — create a file at supabase/.env with:\n' +
      '  SUPABASE_URL=https://YOUR-REF.supabase.co\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY\n' +
      'then run:  node supabase/seed.mjs\n' +
      '(Get both from Supabase → Settings → API. Use the service_role secret, not anon.)',
  )
  process.exit(1)
}
if (SUPABASE_URL.includes('YOUR-REF') || SUPABASE_URL.includes('<')) {
  console.error('SUPABASE_URL still has a placeholder — paste your real project URL.')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Demo accounts
// ---------------------------------------------------------------------------
const USERS = [
  {
    email: 'admin@servicehub.test',
    role: 'admin',
    display_name: 'Avery Admin',
    headline: 'Platform administrator',
  },
  {
    email: 'acme@servicehub.test',
    role: 'client',
    display_name: 'Acme Studios',
    headline: 'Product studio shipping consumer apps',
    bio: 'We build delightful consumer products and hire specialists for focused engagements.',
    location: 'Austin, TX',
  },
  {
    email: 'nordic@servicehub.test',
    role: 'client',
    display_name: 'Nordic Ventures',
    headline: 'Early-stage B2B SaaS',
    bio: 'Seed-stage SaaS team. We move fast and value clear communication.',
    location: 'Remote',
  },
  {
    email: 'maya@servicehub.test',
    role: 'provider',
    display_name: 'Maya Reyes',
    headline: 'Full-stack engineer · React + FastAPI',
    bio: 'Six years building web apps. I like ambiguous problems and tidy code.',
    location: 'Lisbon, PT',
    skills: ['React', 'Next.js', 'FastAPI', 'PostgreSQL', 'TypeScript'],
    hourly_rate: 85,
  },
  {
    email: 'devon@servicehub.test',
    role: 'provider',
    display_name: 'Devon Park',
    headline: 'Product designer · UI/UX',
    bio: 'I design interfaces that feel obvious. Figma to shipped.',
    location: 'Seoul, KR',
    skills: ['Figma', 'UI Design', 'Design Systems', 'Prototyping'],
    hourly_rate: 70,
  },
  {
    email: 'sam@servicehub.test',
    role: 'provider',
    display_name: 'Sam Okafor',
    headline: 'Data engineer · Python + dbt',
    bio: 'Pipelines, warehouses, and dashboards that stakeholders actually use.',
    location: 'Lagos, NG',
    skills: ['Python', 'dbt', 'Airflow', 'BigQuery', 'SQL'],
    hourly_rate: 75,
  },
  {
    email: 'lena@servicehub.test',
    role: 'provider',
    display_name: 'Lena Fischer',
    headline: 'ML engineer · LLM applications',
    bio: 'I ship production LLM features — RAG, evals, and agentic workflows.',
    location: 'Berlin, DE',
    skills: ['Python', 'LLMs', 'RAG', 'PyTorch', 'FastAPI'],
    hourly_rate: 95,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function findUserByEmail(email) {
  // listUsers is paginated; demo set is tiny so page 1 is plenty.
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  return data.users.find((u) => u.email === email)
}

async function upsertUser(spec) {
  let user = await findUserByEmail(spec.email)
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email: spec.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { role: spec.role, display_name: spec.display_name },
    })
    if (error) throw error
    user = data.user
    console.log(`  created ${spec.email}`)
  } else {
    console.log(`  reusing ${spec.email}`)
  }

  // The handle_new_user trigger created a bare profile; enrich it.
  const { error: pErr } = await db.from('profiles').update({
    role: spec.role,
    display_name: spec.display_name,
    headline: spec.headline ?? null,
    bio: spec.bio ?? null,
    location: spec.location ?? null,
    skills: spec.skills ?? [],
    hourly_rate: spec.hourly_rate ?? null,
  }).eq('id', user.id)
  if (pErr) throw pErr

  return user.id
}

async function categoryId(slug) {
  const { data, error } = await db.from('categories').select('id').eq('slug', slug).single()
  if (error) throw error
  return data.id
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function main() {
  console.log('Seeding demo users...')
  const id = {}
  for (const spec of USERS) id[spec.email] = await upsertUser(spec)

  const acme = id['acme@servicehub.test']
  const nordic = id['nordic@servicehub.test']
  const maya = id['maya@servicehub.test']
  const devon = id['devon@servicehub.test']
  const sam = id['sam@servicehub.test']
  const lena = id['lena@servicehub.test']

  // Wipe demo-owned jobs (cascades to applications, contracts, threads, reviews).
  console.log('Clearing previous demo jobs...')
  await db.from('jobs').delete().in('client_id', [acme, nordic])

  // Notifications have no FK to jobs, so deleting jobs leaves stale notifications
  // pointing at now-deleted entities (→ 404 on click). Clear them before the
  // triggers recreate fresh ones during this run.
  await db.from('notifications').delete().in('user_id', Object.values(id))

  const cat = {
    web: await categoryId('web-development'),
    design: await categoryId('design'),
    data: await categoryId('data'),
    ai: await categoryId('ai-ml'),
    marketing: await categoryId('marketing'),
    devops: await categoryId('devops'),
    writing: await categoryId('writing'),
    mobile: await categoryId('mobile-development'),
  }

  console.log('Creating jobs...')
  const jobsSpec = [
    {
      client_id: acme, category_id: cat.web, status: 'open',
      title: 'Build a customer dashboard in Next.js',
      description: 'We need a polished customer-facing dashboard with charts, filters, and a settings area. Existing FastAPI backend; you own the frontend. Strong React + TypeScript required.',
      budget_type: 'fixed', budget_min: 4000, budget_max: 7000,
    },
    {
      client_id: acme, category_id: cat.design, status: 'open',
      title: 'Design system refresh for our web app',
      description: 'Refresh our component library and tokens in Figma, then document usage. Looking for someone strong in design systems.',
      budget_type: 'fixed', budget_min: 3000, budget_max: 5000,
    },
    {
      client_id: nordic, category_id: cat.data, status: 'in_review',
      title: 'Set up an analytics warehouse (dbt + BigQuery)',
      description: 'Stand up a modern data stack: ingestion, dbt models, and a few exec dashboards. Ongoing maintenance possible.',
      budget_type: 'hourly', budget_min: 60, budget_max: 90,
    },
    {
      client_id: nordic, category_id: cat.ai, status: 'awarded',
      title: 'Add an AI assistant to our SaaS (RAG over docs)',
      description: 'Production RAG feature over our help docs with evals. Anthropic API. Must care about latency and quality.',
      budget_type: 'fixed', budget_min: 6000, budget_max: 10000,
    },
    {
      client_id: acme, category_id: cat.web, status: 'draft',
      title: 'Marketing site rebuild (draft — not yet posted)',
      description: 'Rebuild our marketing site for performance and SEO. Still scoping this internally.',
      budget_type: 'fixed', budget_min: 2500, budget_max: 4000,
    },
  ]
  const { data: jobs, error: jErr } = await db.from('jobs').insert(jobsSpec).select()
  if (jErr) throw jErr
  const job = Object.fromEntries(jobs.map((j) => [j.title.slice(0, 20), j]))
  const dashboard = jobs.find((j) => j.title.startsWith('Build a customer'))
  const designJob = jobs.find((j) => j.title.startsWith('Design system'))
  const warehouse = jobs.find((j) => j.title.startsWith('Set up an analytics'))
  const aiJob = jobs.find((j) => j.title.startsWith('Add an AI assistant'))

  console.log('Creating applications...')
  const appsSpec = [
    { job_id: dashboard.id, provider_id: maya, bid_amount: 6000, status: 'shortlisted',
      cover_note: "I've shipped several Next.js dashboards with chart-heavy UIs. I can start this week and would scope it in two milestones." },
    { job_id: dashboard.id, provider_id: lena, bid_amount: 6800, status: 'submitted',
      cover_note: 'Primarily an ML engineer but strong on React. Happy to pair on the data-viz pieces.' },
    { job_id: designJob.id, provider_id: devon, bid_amount: 4200, status: 'submitted',
      cover_note: 'Design systems are my favorite work. I can deliver tokens, components, and docs in Figma.' },
    { job_id: warehouse.id, provider_id: sam, bid_amount: 75, status: 'shortlisted',
      cover_note: 'dbt + BigQuery is my core stack. I can have a first set of models and a dashboard within two weeks.' },
    { job_id: aiJob.id, provider_id: lena, bid_amount: 8500, status: 'accepted',
      cover_note: 'I build production RAG with proper evals. I can show you a similar feature I shipped last quarter.' },
  ]
  const { data: apps, error: aErr } = await db.from('applications').insert(appsSpec).select()
  if (aErr) throw aErr
  const acceptedApp = apps.find((a) => a.status === 'accepted')

  console.log('Creating contract for the awarded job...')
  const { data: contractRows, error: cErr } = await db.from('contracts').insert([{
    job_id: aiJob.id, application_id: acceptedApp.id, client_id: nordic, provider_id: lena,
    agreed_amount: 8500, status: 'active',
    terms: 'Fixed-price RAG feature. Two milestones: (1) ingestion + retrieval, (2) UI + evals.',
  }]).select().single()
  if (cErr) throw cErr

  console.log('Creating escrow milestones...')
  await db.from('milestones').insert([
    { contract_id: contractRows.id, sort_order: 1, title: 'Ingestion + retrieval',
      description: 'Document ingestion pipeline and retrieval with evals harness.',
      amount: 4250, status: 'funded', funded_at: new Date().toISOString() },
    { contract_id: contractRows.id, sort_order: 2, title: 'Assistant UI + evals',
      description: 'Chat UI, streaming, and an eval suite with quality gates.',
      amount: 4250, status: 'pending' },
  ])

  console.log('Backfilling the awarded job timeline...')
  // The status trigger logs each change live, but the seed inserts the awarded
  // job at its final status, so add the intermediate events for a full timeline.
  await db.from('job_events').insert([
    { job_id: aiJob.id, actor_id: nordic, event_type: 'opened', detail: 'Job opened for applications' },
    { job_id: aiJob.id, actor_id: nordic, event_type: 'shortlisted', detail: 'Lena Fischer shortlisted' },
    { job_id: aiJob.id, actor_id: nordic, event_type: 'awarded', detail: 'Awarded to Lena Fischer' },
  ])

  console.log('Creating message thread...')
  const { data: thread, error: tErr } = await db.from('threads').insert([{
    job_id: aiJob.id, client_id: nordic, provider_id: lena,
  }]).select().single()
  if (tErr) throw tErr
  await db.from('messages').insert([
    { thread_id: thread.id, sender_id: nordic, body: 'Welcome aboard, Lena! Excited to get started. When can you kick off milestone 1?' },
    { thread_id: thread.id, sender_id: lena, body: 'Thanks! I can start Monday. I\'ll send a short plan for ingestion + retrieval first.' },
    { thread_id: thread.id, sender_id: nordic, body: 'Perfect. Our docs are in Notion — I\'ll get you access today.' },
  ])

  console.log('Creating a completed contract + reviews (for reputation)...')
  // A past completed engagement so providers have ratings.
  const { data: pastJob } = await db.from('jobs').insert([{
    client_id: acme, category_id: cat.web, status: 'completed',
    title: 'Landing page build (completed)',
    description: 'A quick high-converting landing page. Delivered and accepted.',
    budget_type: 'fixed', budget_min: 1200, budget_max: 1800,
  }]).select().single()
  const { data: pastContract } = await db.from('contracts').insert([{
    job_id: pastJob.id, client_id: acme, provider_id: maya,
    agreed_amount: 1500, status: 'completed', completed_at: new Date().toISOString(),
  }]).select().single()
  await db.from('reviews').insert([
    { contract_id: pastContract.id, reviewer_id: acme, reviewee_id: maya, rating: 5,
      comment: 'Fast, communicative, and the page converts. Would hire again.' },
    { contract_id: pastContract.id, reviewer_id: maya, reviewee_id: acme, rating: 5,
      comment: 'Clear brief and prompt feedback. Great client.' },
  ])

  console.log('Creating more open jobs for the board (search variety)...')
  const moreOpen = [
    { client_id: nordic, category_id: cat.data, status: 'open',
      title: 'Remote Python data pipeline (Airflow)',
      description: 'Build and maintain remote ETL pipelines in Python/Airflow feeding our warehouse. Remote, ongoing, async-friendly team.',
      budget_type: 'hourly', budget_min: 70, budget_max: 110 },
    { client_id: acme, category_id: cat.mobile, status: 'open',
      title: 'React Native app for iOS & Android',
      description: 'Cross-platform mobile app (React Native) with auth, push notifications, and offline sync. Designs provided.',
      budget_type: 'fixed', budget_min: 9000, budget_max: 16000 },
    { client_id: nordic, category_id: cat.marketing, status: 'open',
      title: 'SEO audit + content roadmap',
      description: 'Technical SEO audit and a 3-month content plan to grow organic traffic for our B2B SaaS.',
      budget_type: 'fixed', budget_min: 1500, budget_max: 3000 },
    { client_id: acme, category_id: cat.devops, status: 'open',
      title: 'Migrate infra to Kubernetes (remote)',
      description: 'Containerize services and migrate to a managed Kubernetes cluster with CI/CD and observability. Fully remote.',
      budget_type: 'hourly', budget_min: 90, budget_max: 140 },
    { client_id: nordic, category_id: cat.writing, status: 'open',
      title: 'Technical blog writing (remote, ongoing)',
      description: 'Write 2 developer-focused blog posts per month on data engineering and AI. Remote, byline included.',
      budget_type: 'fixed', budget_min: 800, budget_max: 1500 },
    { client_id: acme, category_id: cat.design, status: 'open',
      title: 'Brand identity & logo design',
      description: 'Fresh brand identity: logo, color, type, and a one-page brand guide for a new product line.',
      budget_type: 'fixed', budget_min: 1200, budget_max: 2500 },
    { client_id: nordic, category_id: cat.web, status: 'open',
      title: 'Full-stack feature work (Next.js + FastAPI)',
      description: 'Ship features across our Next.js frontend and FastAPI backend. Remote contract, ~20 hrs/week.',
      budget_type: 'hourly', budget_min: 65, budget_max: 95 },
    { client_id: acme, category_id: cat.ai, status: 'open',
      title: 'LLM evals & prompt optimization (remote)',
      description: 'Set up an evaluation harness for our LLM features and improve prompt quality and cost. Remote.',
      budget_type: 'fixed', budget_min: 3000, budget_max: 6000 },
  ]
  const { data: openJobs } = await db.from('jobs').insert(moreOpen).select()

  console.log('Creating applications on open jobs...')
  const byTitle = (s) => openJobs.find((j) => j.title.startsWith(s))
  await db.from('applications').insert([
    { job_id: byTitle('Remote Python').id, provider_id: sam, bid_amount: 85, status: 'submitted',
      cover_note: 'Airflow + Python is my bread and butter. I can take over the pipelines and improve reliability.' },
    { job_id: byTitle('Full-stack feature').id, provider_id: maya, bid_amount: 80, status: 'shortlisted',
      cover_note: 'I work across Next.js and FastAPI daily — happy to start part-time this week.' },
    { job_id: byTitle('Full-stack feature').id, provider_id: lena, bid_amount: 90, status: 'submitted',
      cover_note: 'Strong full-stack + AI background. I can also help with the LLM features.' },
    { job_id: byTitle('LLM evals').id, provider_id: lena, bid_amount: 4500, status: 'submitted',
      cover_note: 'I build eval harnesses and tune prompts for quality and cost. Can show prior results.' },
    { job_id: byTitle('React Native').id, provider_id: maya, bid_amount: 12000, status: 'submitted',
      cover_note: 'Shipped several React Native apps with offline sync and push. Designs-ready is ideal.' },
  ])

  console.log('Creating two more active engagements (contracts + escrow)...')
  const now = new Date().toISOString()
  async function createEngagement({ client, provider, category, title, description, amount, milestones }) {
    const { data: j } = await db
      .from('jobs')
      .insert([{ client_id: client, category_id: category, status: 'awarded', title, description, budget_type: 'fixed', budget_min: amount, budget_max: amount }])
      .select()
      .single()
    const { data: app } = await db
      .from('applications')
      .insert([{ job_id: j.id, provider_id: provider, bid_amount: amount, status: 'accepted', cover_note: 'Excited to take this on — I can start right away.' }])
      .select()
      .single()
    const { data: c } = await db
      .from('contracts')
      .insert([{ job_id: j.id, application_id: app.id, client_id: client, provider_id: provider, agreed_amount: amount, status: 'active' }])
      .select()
      .single()
    await db.from('milestones').insert(milestones.map((m, i) => ({ contract_id: c.id, sort_order: i + 1, ...m })))
    await db.from('job_events').insert([
      { job_id: j.id, actor_id: client, event_type: 'opened', detail: 'Job opened for applications' },
      { job_id: j.id, actor_id: client, event_type: 'awarded', detail: 'Awarded' },
    ])
    const { data: th } = await db.from('threads').insert([{ job_id: j.id, client_id: client, provider_id: provider }]).select().single()
    await db.from('messages').insert([
      { thread_id: th.id, sender_id: client, body: 'Welcome aboard! Let me know once you kick things off.' },
      { thread_id: th.id, sender_id: provider, body: "Thanks — starting now. I'll share progress on the first milestone soon." },
    ])
  }

  await createEngagement({
    client: nordic, provider: sam, category: cat.data, amount: 5400,
    title: 'dbt analytics models + exec dashboard',
    description: 'Build dbt models and an executive dashboard on our warehouse data.',
    milestones: [
      { title: 'Core dbt models', description: 'Staging + mart models with tests.', amount: 2700, status: 'funded', funded_at: now },
      { title: 'Exec dashboard', description: 'Dashboards + handoff docs.', amount: 2700, status: 'pending' },
    ],
  })
  await createEngagement({
    client: acme, provider: devon, category: cat.design, amount: 4800,
    title: 'Mobile app UI/UX design',
    description: 'End-to-end UI/UX for the new mobile app, delivered in Figma.',
    milestones: [
      { title: 'Wireframes + flows', description: 'Low-fi flows and IA.', amount: 1600, status: 'released', funded_at: now, released_at: now },
      { title: 'High-fidelity UI', description: 'Polished screens + components.', amount: 3200, status: 'funded', funded_at: now },
    ],
  })
  // The demo provider (Maya) gets an active contract too, so the provider
  // portal looks populated when you "View as Provider".
  await createEngagement({
    client: acme, provider: maya, category: cat.web, amount: 6500,
    title: 'Internal analytics dashboard (Next.js)',
    description: 'Build an internal analytics dashboard with charts, filters, and a settings area on top of our FastAPI backend.',
    milestones: [
      { title: 'Core dashboard + charts', description: 'Main views and chart components.', amount: 3500, status: 'released', funded_at: now, released_at: now },
      { title: 'Settings + polish', description: 'Settings area, empty states, and QA pass.', amount: 3000, status: 'funded', funded_at: now },
    ],
  })

  console.log('\nDone. Demo accounts (password: ' + DEMO_PASSWORD + '):')
  for (const u of USERS) console.log(`  ${u.role.padEnd(9)} ${u.email}`)
}

main().catch((e) => {
  console.error('\nSeed failed:', e.message || e)
  process.exit(1)
})
