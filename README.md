# NIFES Study Hub

A digital academic library and study platform for Nigerian university students. Browse past questions, upload/download course materials, take practice quizzes (including MCQ with auto-grading), and calculate CGPA — all in one place.

## Features

- **Landing Page** — Learn about NIFES FUTMinna before entering the hub
- **Past Questions** — Browse by level (100–300), course, year, and type
- **MCQ Support** — Create and view multiple-choice questions with options A–D
- **Practice Tests** — CBT-style quizzes with answer reveal, scoring, and retry
- **Study Mode** — Hides answers by default, reveal one at a time
- **Course Materials** — Upload and view PDFs, lecture notes, and textbooks
- **Scientific Calculator** — Trig, log, roots, powers, and more
- **CGPA Calculator** — Nigerian 5.0 grading scale, per-semester GPA + cumulative
- **User Accounts** — Sign in with email or Google to contribute
- **Search** — Full-text search across all questions
- **Dark/Light Mode** — System-aware, persistent preference

## Project Structure

```
nifes-study-hub/
├── index.html              ← Landing page (start here)
├── app/
│   ├── index.html          ← Main application
│   ├── css/styles.css      ← All styles (design system)
│   └── js/
│       ├── config.js       ← Supabase credentials (gitignored)
│       ├── seed.js         ← Offline seed data + MCQ helper
│       ├── db.js           ← Supabase data layer (all API calls)
│       ├── tools.js        ← Calculator + CGPA calculator
│       └── app.js          ← UI layer (navigation, quiz, auth, search, theme)
├── sql/
│   ├── schema.sql          ← Database table definitions
│   ├── policies.sql        ← Row Level Security policies
│   └── seed.sql            ← Seed data for Supabase
├── .gitignore
├── .env.example
└── README.md
```

## Setup

### 1. Supabase (Backend)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project (choose the free tier)
3. Go to **SQL Editor** and run the files in order:
   - `sql/schema.sql` — Creates all database tables
   - `sql/policies.sql` — Sets up Row Level Security
   - `sql/seed.sql` — Adds 16 seed past questions
4. Go to **Storage** → **Create bucket** → Name: `study-materials` → Public bucket
5. Go to **Authentication** → **Providers** → Enable Email/Password and Google OAuth
6. Go to **Settings** → **API** → Copy your **Project URL** and **anon public key**

### 2. Configure the App

Open `app/js/config.js` and paste your credentials:

```javascript
var SUPABASE_URL = 'https://your-project.supabase.co';  // ← Paste your URL here
var SUPABASE_ANON_KEY = 'your-anon-key';                 // ← Paste your anon key here
```

**Important:** `app/js/config.js` is in `.gitignore` — your keys won't be committed to Git.

### 3. Run the App

Serve the project root with any static server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` to see the landing page, or go directly to `http://localhost:8000/app/`.

### 3. Run the Backend (for PDF extraction)

The backend server extracts questions from uploaded PDFs.

```bash
cd server
cp .env.example .env       # Edit .env with your Supabase credentials
npm install
npm start                  # Runs on http://localhost:3001
```

Then when you use the "Extract from PDF" tab in the app, it sends the PDF to this server and returns detected questions for review.

### 4. Deploy (Optional)

The frontend is a static site and can be deployed anywhere:

- **Vercel**: Connect your GitHub repo → deploy
- **Netlify**: Drag-and-drop the project folder
- **GitHub Pages**: Push to `gh-pages` branch

## Project Structure

```
nifes-study-hub/
├── index.html            # Landing page (NIFES history + CTA to app)
├── app/
│   ├── index.html        # Main app shell (all views)
│   ├── css/
│   │   └── styles.css    # Complete design system
│   └── js/
│       ├── config.js     # Supabase credentials + SERVER_URL (gitignored)
│       ├── seed.js       # 18 offline seed questions + MCQ helpers
│       ├── db.js         # Supabase CRUD data layer
│       ├── tools.js      # Scientific calculator + CGPA calculator
│       └── app.js        # UI layer (nav, auth, quiz, materials, search, theme)
├── server/               # Backend for PDF → question extraction
│   ├── index.js          # Express entry point
│   ├── package.json
│   ├── routes/extract.js # POST /api/extract + /api/upload-extracted
│   ├── services/pdfParser.js
│   ├── services/questionExtractor.js
│   └── uploads/          # Temp PDF storage (gitignored)
├── sql/
│   ├── schema.sql        # Database table definitions
│   ├── policies.sql      # Row Level Security policies
│   └── seed.sql          # Seed data (18 questions, 2 MCQ)
├── .gitignore
├── .env.example
└── README.md
```

## Usage

| Action | How |
|--------|-----|
| Browse questions | Click a level in sidebar or course card on dashboard |
| Take a quiz | Click **Practice Test** in sidebar |
| Study Mode | Toggle **Study Mode** switch in the PQ filter bar |
| Add a question | Click **Add Question** → fill form (requires sign in) |
| Upload material | Click **Add Question** → switch to **Upload Material** tab |
| Use calculator | Click **Scientific Calculator** in sidebar Tools section |
| Calculate CGPA | Click **CGPA Calculator** in sidebar Tools section |
| Search | Click the search icon in the header |
| Dark/Light mode | Click the moon/sun icon in the header |

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES Modules)
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **Hosting**: Any static site host (Vercel, Netlify, GitHub Pages)

## License

MIT
