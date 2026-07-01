# NIFES Study Hub

A digital academic library and study platform for Nigerian university students. Browse past questions, upload/download course materials, take practice quizzes, and calculate CGPA — all in one place.

## Features

- **Past Questions** — Browse by level (100–300), course, year, and type
- **Practice Tests** — CBT-style quizzes with answer reveal, scoring, and retry
- **Study Mode** — Hides answers by default, reveal one at a time
- **Course Materials** — Upload and view PDFs, lecture notes, and textbooks
- **Scientific Calculator** — Trig, log, roots, powers, and more
- **CGPA Calculator** — Nigerian 5.0 grading scale, per-semester GPA + cumulative
- **User Accounts** — Sign in with email or Google to contribute
- **Search** — Full-text search across all questions
- **Dark/Light Mode** — System-aware, persistent preference

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

Open `js/app.js` and replace the placeholders:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';  // ← Paste your URL here
const SUPABASE_ANON_KEY = 'your-anon-key';                 // ← Paste your anon key here
```

### 3. Deploy (Optional)

The app is a static site and can be deployed anywhere:

- **Vercel**: Connect your GitHub repo → deploy
- **Netlify**: Drag-and-drop the project folder
- **GitHub Pages**: Push to `gh-pages` branch

No build step required — it's pure HTML, CSS, and JS.

## Project Structure

```
nifes-study-hub/
├── index.html           # Main HTML
├── css/
│   └── styles.css       # Complete design system
├── js/
│   └── app.js           # All application logic + Supabase API + calculators
├── sql/
│   ├── schema.sql       # Database table definitions
│   ├── policies.sql     # Row Level Security policies
│   └── seed.sql         # Seed data (16 initial questions)
├── .env.example         # Environment variable template
└── README.md            # This file
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
