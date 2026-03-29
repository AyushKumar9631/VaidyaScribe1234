<div align="center">

<br/>

<img src="https://img.shields.io/badge/VaidyaScribe-Ambient%20AI%20Scribe-0ea47a?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI2IiBmaWxsPSIjMGVhNDdhIi8+PHBhdGggZD0iTTYgMTJDNiA5IDE4LjM3MyA5IDEyIDlDMTIgOSAxOCAxMC4zNzMgMTggMTIiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxNiIgcj0iMyIgZmlsbD0id2hpdGUiLz48L3N2Zz4=" alt="VaidyaScribe"/>

<h1>VaidyaScribe</h1>

<p><strong>A doctor speaks. A medical record is born.</strong></p>

<p>
  Ambient AI Clinical Scribe · FHIR R4 · Multilingual · Built at IIT Patna
</p>

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-vaidyascribe.vercel.app-0ea47a?style=for-the-badge)](https://vaidyascribe.vercel.app/)
[![IIT Patna](https://img.shields.io/badge/Built_at-IIT_Patna-f59e0b?style=for-the-badge)](https://www.iitp.ac.in)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=flat-square&logo=vite)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-Whisper_+_Qwen3-f97316?style=flat-square)](https://groq.com)
[![FHIR R4](https://img.shields.io/badge/FHIR-R4_Compliant-e11d48?style=flat-square)](https://hl7.org/fhir)
[![PWA](https://img.shields.io/badge/PWA-Installable-5a67d8?style=flat-square)](https://web.dev/progressive-web-apps)

</div>

---

## 🌐 Live Deployment

<div align="center">

### **Access the deployed application here:**

### **[https://vaidyascribe.vercel.app/](https://vaidyascribe.vercel.app/)**

</div>

## 🔐 Demo Credentials

Use the following accounts to explore the full app instantly — no sign-up required:

<div align="center">

| Role | Email | Password | What you can do |
|:----:|:------|:---------|:----------------|
| 👨‍⚕️ **Doctor** | `doctor1@gmail.com` | `doctor1` | Record sessions, view SOAP notes, browse patient history |
| 🏥 **Hospital Admin** | `admin@gmail.com` | `admin123` | Manage hospital details, view linked doctors |

</div>

> ⚠️ **Note:** These are shared demo accounts provided for review purposes. Please do not change passwords or delete existing records so other reviewers can also explore the app.

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   A doctor finishes explaining a diagnosis.                         ║
║   Before the patient stands up, the record already exists.          ║
║                                                                      ║
║   Transcript. Clinical notes. SOAP note. FHIR R4 bundle.            ║
║   Four structured outputs. One voice. Under five seconds.           ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 📖 Table of Contents

- [What is VaidyaScribe?](#-what-is-vaidyascribe)
- [Screenshots — Site Walkthrough](#-screenshots--site-walkthrough)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [AI Pipeline](#-ai-pipeline)
- [Database Schema](#-database-schema)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Role System](#-role-system)
- [FHIR R4 Output](#-fhir-r4-output)
- [SOAP Notes](#-soap-notes)
- [Multilingual Support](#-multilingual-support)
- [PWA — Install on Mobile](#-pwa--install-on-mobile)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Team](#-team)

---

## 🩺 What is VaidyaScribe?

VaidyaScribe is an **ambient AI clinical scribe** designed for Indian healthcare. Instead of typing notes after every consultation, a doctor simply records the conversation — VaidyaScribe transcribes it, extracts structured clinical data, generates a **SOAP note**, and produces a standards-compliant **FHIR R4 bundle**, all in under 5 seconds.

```
Doctor speaks → Whisper transcribes → Qwen3-32B extracts → FHIR R4 bundle saved
                                                          → SOAP note generated
                                                          → Doctor reviews & submits
```

> **Nothing is saved automatically.** The doctor reviews all four outputs (Transcript · Clinical Notes · SOAP · FHIR) and explicitly hits **Save Record** — only then is the data committed to the database.

---

## 📸 Screenshots — Site Walkthrough

### 1 · Landing Page

> On load, a full-screen splash shows the VaidyaScribe name and tagline, then the logo animates to the top-left as the marketing page fades in.

<!-- SCREENSHOT: landing-page.png -->
<!-- Replace the line below with your actual screenshot -->
```
📷  [ Insert screenshot: Landing Page — hero section with animated words ]
```
> **Path:** `docs/screenshots/landing-page.png`

The hero section cycles through: **Examining → Transcribing → Prescribing → Diagnosing** and the "Built for" line typewriter-animates through: **Doctors → Hospitals → Clinics → Specialists**.

---

### 2 · Doctor Login & Registration

The Doctor portal uses **Supabase Auth** (email + password). New accounts auto-create a `profiles` row with `role = 'doctor'`.

<!-- SCREENSHOT: doctor-auth.png -->
```
📷  [ Insert screenshot: Doctor Auth page ]
```
> **Path:** `docs/screenshots/doctor-auth.png`

---

### 3 · Doctor Dashboard — Recording a Session

Once logged in, the doctor enters a **Patient ID** and **Patient Name**, selects language, and taps record. VaidyaScribe listens in the background.

<!-- SCREENSHOT: doctor-page.png -->
```
📷  [ Insert screenshot: Doctor Recording Panel — active session ]
```
> **Path:** `docs/screenshots/doctor-page.png`

**Processing steps shown in real time:**
1. `Transcribing audio with Whisper...`
2. `Extracting clinical entities with Qwen3-32B...`
3. `Generating FHIR R4 bundle...`

---

### 4 · Clinical Notes Tab

After processing, the **🩺 Clinical Notes** tab shows extracted entities in a structured grid — chief complaint, vitals, diagnosis, medications, lab orders, and follow-up.

<!-- SCREENSHOT: clinical-notes.png -->
```
📷  [ Insert screenshot: Clinical Notes — structured grid view ]
```
> **Path:** `docs/screenshots/clinical-notes.png`

---

### 5 · SOAP Note Tab

The **📋 SOAP Note** tab shows the auto-generated S/O/A/P structured note. Every field is **editable** — click **✏️ Edit** (top-right) to modify any section before submitting.

```
S — Subjective  : Chief complaint, duration, symptoms, patient demographics
O — Objective   : Vitals, physical findings, pending labs
A — Assessment  : Diagnosis / clinical impression
P — Plan        : Medications (dose + frequency), follow-up, lab orders
```

---

### 6 · FHIR Bundle Tab

The **⚕️ FHIR Bundle** tab renders the full R4-compliant JSON bundle with collapsible resource cards (Patient, Encounter, Conditions, Medications, Observations).

---

### 7 · Submit Bar

> Below all tabs, a **Save Record** button appears. No data touches the database until the doctor explicitly submits.

```
[ Review tabs ] → [ Edit SOAP if needed ] → [ Save Record → ]
```

On success: green confirmation banner + "New session" button.

---

### 8 · Patient Session History (inline)

Scrolling below the recording panel shows all past sessions for the **currently entered Patient ID** — with SOAP ✓ badges, diagnosis pills, and medication pills on each card.

---

### 9 · Admin Dashboard

<!-- SCREENSHOT: admin-page.png -->
```
📷  [ Insert screenshot: Admin Dashboard — Hospital Details tab ]
```
> **Path:** `docs/screenshots/admin-page.png`

Hospital admins get a separate portal with two tabs:

| Tab | What it does |
|-----|-------------|
| 🏥 Hospital Details | Set hospital name, address, registration number |
| 👨‍⚕️ Doctors | View all linked doctors, session counts, last active |

Admins register via `AdminAuth` — the system sets `role = 'admin'` in the profiles table.

---

## ✨ Key Features

| Feature | Detail |
|---------|--------|
| 🎙️ **Ambient Recording** | Browser MediaRecorder API — no extra app needed |
| ⚡ **< 3s Transcription** | Groq Whisper large-v3 with language hint |
| 🧠 **Clinical NLP** | Qwen3-32B extracts 10 clinical entity types |
| 📋 **SOAP Notes** | Auto-generated + fully editable before submit |
| ⚕️ **FHIR R4** | Patient, Encounter, Condition, Medication, Observation resources |
| 🌐 **Multilingual** | Hindi, English, Bengali, French, Spanish, Arabic, Mandarin |
| 🔒 **Deferred Save** | Doctor reviews all outputs before a single DB write |
| 🏥 **Multi-Hospital** | Doctors link to hospitals; admins manage their hospital |
| 📱 **PWA** | Installable on Android/iOS, works offline (UI only) |
| 🗂️ **History Views** | Per-patient inline history + global history panel with SOAP tab |
| 🔐 **Row-Level Security** | Supabase RLS — doctors only see their own records |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (PWA)                        │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  LandingPage │    │  DoctorApp   │    │  AdminApp    │  │
│  │  (Marketing) │    │  (Recording) │    │  (Dashboard) │  │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘  │
│                             │                   │           │
└─────────────────────────────┼───────────────────┼───────────┘
                              │                   │
              ┌───────────────▼───────┐   ┌───────▼──────────┐
              │      Groq Cloud       │   │  Supabase Cloud  │
              │                       │   │                  │
              │  ┌─────────────────┐  │   │  ┌───────────┐  │
              │  │  Whisper v3     │  │   │  │   Auth    │  │
              │  │  (Transcription)│  │   │  └───────────┘  │
              │  └────────┬────────┘  │   │  ┌───────────┐  │
              │           │           │   │  │ Postgres  │  │
              │  ┌────────▼────────┐  │   │  │ (Tables)  │  │
              │  │  Qwen3-32B      │  │   │  └───────────┘  │
              │  │  (NLP + SOAP)   │  │   │  ┌───────────┐  │
              │  └────────┬────────┘  │   │  │    RLS    │  │
              │           │           │   │  │ Policies  │  │
              └───────────┼───────────┘   └──┤───────────┘  │
                          │                  └──────────────┘
                          │ FHIR R4 Builder
                          │ (client-side)
                          ▼
                   session_logs table
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite 6 | UI framework |
| **Styling** | Pure CSS (no Tailwind) | Custom dark-teal design system |
| **PWA** | vite-plugin-pwa | Offline shell + installability |
| **Auth** | Supabase Auth | Email/password, session management |
| **Database** | Supabase Postgres + RLS | Persistent storage, row-level security |
| **Transcription** | Groq Whisper large-v3 | Speech-to-text, < 2s latency |
| **NLP** | Groq Qwen3-32B | Clinical entity extraction + SOAP generation |
| **FHIR** | Custom JS builder | Client-side FHIR R4 bundle construction |
| **Hosting** | <!-- FILL: Vercel / Netlify / etc --> | Static deployment |

---

## 📁 Project Structure

```
scribe-app/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── icon-192.png           # PWA icons
│   └── icon-512.png
│
├── src/
│   ├── main.jsx               # Entry point
│   ├── App.jsx                # Root component — auth routing, state orchestration
│   │
│   ├── components/
│   │   ├── LandingPage.jsx    # Marketing page (splash, hero, customers, features)
│   │   ├── Header.jsx         # Doctor app top bar
│   │   ├── RecordingPanel.jsx # Mic button, patient info, waveform, timer
│   │   ├── TranscriptPanel.jsx# Raw transcript display + translate button
│   │   ├── SOAPPanel.jsx      # Editable SOAP note (S/O/A/P)
│   │   ├── FHIRPanel.jsx      # FHIR R4 bundle viewer (collapsible)
│   │   ├── PatientHistory.jsx # Slide-in panel — all sessions (global)
│   │   ├── PatientSessionHistory.jsx  # Inline — sessions by patient ID
│   │   ├── DoctorAuth.jsx     # Doctor login / signup
│   │   ├── AdminAuth.jsx      # Admin login / signup
│   │   ├── AdminDashboard.jsx # Admin portal (hospital + doctors tabs)
│   │   ├── AuthGate.jsx       # Auth wrapper utility
│   │   └── LinkHospital.jsx   # Doctor → Hospital linking modal
│   │
│   ├── services/
│   │   ├── groq.js            # transcribeAudio() + extractClinicalEntities()
│   │   ├── fhir.js            # buildFHIRBundle() — FHIR R4 construction
│   │   └── supabase.js        # Supabase client init
│   │
│   └── styles/
│       └── global.css         # Full design system (dark theme, all components)
│
├── vite.config.js             # Vite + React + PWA plugins
└── package.json
```

---

## 🤖 AI Pipeline

### Step 1 — Transcription (Groq Whisper)

```js
// services/groq.js
transcribeAudio(audioBlob, apiKey, languageCode)
// → POST /audio/transcriptions
// → model: "whisper-large-v3"
// → Returns: raw transcript string
```

The language code hint (e.g., `"hi"` for Hindi) is passed to Whisper to improve accuracy on Indian languages and code-mixed speech.

### Step 2 — Clinical NLP (Groq Qwen3-32B)

```js
extractClinicalEntities(transcript, apiKey, languageLabel)
// → POST /chat/completions
// → model: "qwen/qwen3-32b"
// → Returns structured JSON:
{
  "chief_complaint": "...",
  "symptoms":        ["...", "..."],
  "duration":        "...",
  "vitals":          { "BP": "...", "Temperature": "...", "SpO2": "..." },
  "diagnosis":       ["..."],
  "medications":     ["... dose frequency"],
  "lab_orders":      ["..."],
  "follow_up":       "...",
  "patient_name":    "...",
  "patient_age":     "...",
  "patient_gender":  "..."
}
```

The prompt instructs Qwen3 to respond **only** in JSON (no markdown, no `<think>` tags), and the response is cleaned and parsed client-side.

### Step 3 — SOAP Derivation (client-side)

```js
deriveSoap(clinicalData, transcript)
// Pure JS — no API call
// Maps clinical entity fields → S / O / A / P sections
```

| SOAP Section | Derived from |
|-------------|-------------|
| **S** — Subjective | `chief_complaint`, `duration`, `symptoms`, demographics |
| **O** — Objective | `vitals`, `lab_orders` (pending) |
| **A** — Assessment | `diagnosis` |
| **P** — Plan | `medications`, `follow_up`, `lab_orders` (ordered) |

### Step 4 — FHIR R4 Bundle (client-side)

```js
buildFHIRBundle(entities)
// Returns a FHIR R4 Bundle with resources:
// Patient · Encounter · Condition(s) · MedicationRequest(s) · Observation(s)
```

---

## 🗄️ Database Schema

### Tables

#### `profiles`
```sql
id          uuid  PRIMARY KEY REFERENCES auth.users
role        text  -- 'doctor' | 'admin'
created_at  timestamptz
```

#### `hospitals`
```sql
id              uuid  PRIMARY KEY
admin_id        uuid  REFERENCES profiles(id)
hospital_name   text
address         text
registration_no text
created_at      timestamptz
```

#### `doctor_hospital_links`
```sql
id          uuid  PRIMARY KEY
doctor_id   uuid  REFERENCES profiles(id)
hospital_id uuid  REFERENCES hospitals(id)
created_at  timestamptz
```

#### `session_logs`
```sql
id            uuid        PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid        REFERENCES auth.users
patient_id    text        -- doctor-assigned patient identifier
patient_name  text
transcript    text        -- raw Whisper output
clinical_data jsonb       -- Qwen3 structured extraction
soap_note     jsonb       -- { subjective, objective, assessment, plan }
fhir_bundle   jsonb       -- full FHIR R4 Bundle
created_at    timestamptz DEFAULT now()
```

### Migration — add SOAP column

If upgrading from a version without SOAP support, run:

```sql
ALTER TABLE session_logs
  ADD COLUMN IF NOT EXISTS soap_note JSONB DEFAULT NULL;

-- Optional GIN index for JSONB search
CREATE INDEX IF NOT EXISTS idx_session_logs_soap_note
  ON session_logs USING gin (soap_note);
```

### RLS Policies

```sql
-- Doctors can only read/write their own session logs
CREATE POLICY "doctor_own_logs" ON session_logs
  USING (auth.uid() = user_id);

-- Admins can read logs for doctors in their hospital
-- (implement as needed per your admin query pattern)
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| Supabase account | — |
| Groq API key | — |

### 1 — Clone the repo

```bash
git clone https://github.com/<!-- FILL: your-org/vaidyascribe -->.git
cd vaidyascribe/scribe-app
```

### 2 — Install dependencies

```bash
npm install
```

### 3 — Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Open the SQL editor and run the schema below:

```sql
-- profiles table (auto-populated by trigger on signup)
CREATE TABLE profiles (
  id   uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'doctor',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE hospitals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        uuid REFERENCES profiles(id),
  hospital_name   text,
  address         text,
  registration_no text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE doctor_hospital_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   uuid REFERENCES profiles(id),
  hospital_id uuid REFERENCES hospitals(id),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE session_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users,
  patient_id    text,
  patient_name  text,
  transcript    text,
  clinical_data jsonb,
  soap_note     jsonb,
  fhir_bundle   jsonb,
  created_at    timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "users_own_logs" ON session_logs
  FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role) VALUES (new.id, 'doctor');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 4 — Get a Groq API key

1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key from the dashboard

### 5 — Configure environment

```bash
cp .env.example .env
# Then fill in the values (see Environment Variables section)
```

### 6 — Run locally

```bash
npm run dev
# → http://localhost:5173
```

### 7 — Build for production

```bash
npm run build
# Output in /dist — deploy to any static host
```

---

## 🔑 Environment Variables

Create a `.env` file in `/scribe-app`:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Groq (Whisper + Qwen3)
VITE_GROQ_API_KEY=gsk_your_groq_api_key_here
```

> ⚠️ `VITE_` prefix is required for Vite to expose variables to the browser bundle.
> Never commit `.env` to version control — it is already in `.gitignore`.

**`.env.example`** (safe to commit):
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GROQ_API_KEY=
```

---

## 👥 Role System

VaidyaScribe has two roles, both using Supabase Auth:

```
┌──────────┐         ┌───────────┐
│  Doctor  │         │   Admin   │
├──────────┤         ├───────────┤
│ Record   │         │ Manage    │
│ sessions │         │ hospital  │
│          │         │ details   │
│ View own │         │           │
│ history  │         │ View all  │
│          │         │ doctors   │
│ Link to  │         │           │
│ hospital │         │ See stats │
└──────────┘         └───────────┘
```

**Setting a user as Admin:**

After the user signs up (they get `role = 'doctor'` by default), update their role:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';
```

Or use the Supabase dashboard → Table Editor → profiles.

---

## ⚕️ FHIR R4 Output

Each submitted session produces a FHIR R4 Bundle containing:

| Resource | Content |
|----------|---------|
| `Patient` | Name, gender, estimated birth year |
| `Encounter` | Ambulatory encounter, timestamp |
| `Condition` | One resource per diagnosis (ICD hint) |
| `MedicationRequest` | One resource per prescribed medication |
| `Observation` | One resource per vital sign |

**Sample bundle structure:**
```json
{
  "resourceType": "Bundle",
  "type": "document",
  "entry": [
    { "resource": { "resourceType": "Patient", ... } },
    { "resource": { "resourceType": "Encounter", ... } },
    { "resource": { "resourceType": "Condition", ... } },
    { "resource": { "resourceType": "MedicationRequest", ... } }
  ]
}
```

The bundle can be exported from the FHIR tab and imported into any HL7 FHIR R4-compatible EHR.

---

## 📋 SOAP Notes

SOAP notes are automatically derived from the Qwen3 clinical extraction and presented in an editable 2×2 grid. The doctor can modify any section before saving.

```
┌─────────────────────────┬─────────────────────────┐
│  S  Subjective          │  O  Objective           │
│  Chief complaint,       │  Vitals, exam findings, │
│  symptoms, duration     │  pending labs           │
├─────────────────────────┼─────────────────────────┤
│  A  Assessment          │  P  Plan                │
│  Diagnosis / clinical   │  Medications, follow-up,│
│  impression             │  lab orders             │
└─────────────────────────┴─────────────────────────┘
```

Stored as JSONB in `session_logs.soap_note`. Visible in both history panels with a **SOAP ✓** badge on sessions that have a note.

---

## 🌐 Multilingual Support

| Language | Code | Notes |
|----------|------|-------|
| Hindi | `hi` | Default; Whisper fine-tuned for Devanagari |
| English | `en` | |
| Bengali | `bn` | |
| French | `fr` | |
| Spanish | `es` | |
| Arabic | `ar` | |
| Mandarin | `zh` | |

The language code is passed directly to Whisper's `language` parameter, which significantly improves transcription accuracy. Qwen3 translates all extracted entities to English regardless of source language.

---

## 📱 PWA — Install on Mobile

VaidyaScribe is a Progressive Web App. To install on a device:

**Android (Chrome):**
1. Open the app URL in Chrome
2. Tap the **⋮** menu → "Add to Home screen"
3. The app installs like a native app

**iOS (Safari):**
1. Open the app URL in Safari
2. Tap the **Share** icon → "Add to Home Screen"

Once installed, the app shell loads offline (UI renders without internet; API calls require connectivity).

---

## 🌍 Deployment

### Vercel (recommended)

```bash
npm i -g vercel
cd scribe-app
vercel --prod
```

Set environment variables in the Vercel dashboard under **Settings → Environment Variables**.

### Netlify

```bash
npm run build
# Drag the /dist folder into Netlify dashboard
# Or connect GitHub repo and set build command: npm run build
# Publish directory: dist
```

Set env vars in **Site Settings → Environment Variables**.

### Docker (self-hosted)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

```bash
docker build -t vaidyascribe .
docker run -p 80:80 vaidyascribe
```

---

## 🗺️ Roadmap

- [x] Ambient voice recording
- [x] Whisper transcription (multilingual)
- [x] Qwen3 clinical NLP extraction
- [x] FHIR R4 bundle generation
- [x] Editable SOAP notes
- [x] Deferred submit (review before save)
- [x] Role-based access (Doctor / Admin)
- [x] Hospital linking
- [x] Per-patient session history
- [x] PWA (installable)
- [x] Dark theme marketing landing page
- [ ] PDF prescription export
- [ ] ABDM / Ayushman Bharat integration
- [ ] Real-time co-scribe (two devices, one session)
- [ ] Voice commands ("skip to plan", "add medication")
- [ ] Doctor performance analytics dashboard
- [ ] WhatsApp prescription sharing
- [ ] Offline transcription (on-device Whisper)

---

## 🤝 Contributing

Contributions are welcome! Here's how:

```bash
# 1. Fork the repository
# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes
# 4. Commit with a clear message
git commit -m "feat: add prescription PDF export"

# 5. Push and open a pull request
git push origin feature/your-feature-name
```

**Branch naming:**
- `feature/` — new features
- `fix/` — bug fixes
- `docs/` — documentation only
- `refactor/` — code refactoring

**Before submitting a PR:**
- [ ] App builds without errors (`npm run build`)
- [ ] No console errors in browser
- [ ] `.env` is not committed

---

## 👨‍💻 Team

Built with ❤️ at **IIT Patna** for the Indian healthcare ecosystem.

| Name | Role | Contact |
|------|------|---------|
| <!-- FILL: Name --> | Lead Developer | <!-- FILL: email / GitHub --> |
| <!-- FILL: Name --> | AI/ML | <!-- FILL: email / GitHub --> |
| <!-- FILL: Name --> | Backend / Database | <!-- FILL: email / GitHub --> |
| <!-- FILL: Name --> | UI/UX | <!-- FILL: email / GitHub --> |

**Advisors & Partners:**
- NJACK — IIT Patna
- NIT Patna
- <!-- FILL: Hospital partner names -->

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**VaidyaScribe** · Built at IIT Patna · For Indian Healthcare

*A doctor speaks. A medical record is born.*

[![Star this repo](https://img.shields.io/github/stars/<!-- FILL: your-org/vaidyascribe -->?style=social)](https://github.com/<!-- FILL: your-org/vaidyascribe -->)

</div>
