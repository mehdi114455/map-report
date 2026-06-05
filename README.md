# MapReport AI

An AI powered civic issue reporting platform. Residents can submit complaints in natural language with photos and a map pin; the system auto classifies the issue, detects duplicates of nearby similar reports, and gives admins a live dashboard with hotspot maps.

Capstone project, CIS 498. Group 04, Syed Mehdi.

## Features

- **Natural-language reporting** - describe the natural language
- **AI category classification** - TF-IDF + Linear SVM trained on civic issue data (6 categories for MVP)
- **Duplicate detection** - Sentence transformer + PostGIS proximity merge near identical reports
- **Photo uploads** - Firebase Storage with size and format validation
- **Interactive map** - Leaflet + Stadia Maps, with click-to-pin, browser geolocation, and filtering
- **Admin dashboard** - System stats, hotspot map, urgent-reports queue, re-categorization, status updates that cascade to clusters
- **Live updates** - WebSocket pushes status changes to residents in real time
- **Role-based auth** - Firebase Authentication with custom claims for `resident` vs `admin`

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4 + Leaflet + Firebase JS SDK |
| Backend | Python 3.11 + FastAPI + SQLAlchemy 2.0 + Alembic + Firebase Admin SDK |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| AI / NLP | scikit-learn (TF-IDF + LinearSVC), sentence-transformers (all-MiniLM-L6-v2) |
| Auth | Firebase Authentication (email/password) |
| Image storage | Firebase Storage |
| Real-time | FastAPI WebSockets |
| Local dev | Docker Compose for Postgres+PostGIS |

## Prerequisites

*Project was developed and tested on MacOS 26.5*
- [Git](https://git-scm.com/)
- [Node.js 20+](https://nodejs.org) (Used Node 24 in dev)
- [Python 3.11](https://www.python.org/downloads/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- A Google account for Firebase

## First-time Setup

### 1. Clone

```bash
git clone https://github.com/mehdi114455/map-report.git
cd map-report
```

### 2. Firebase project

This project uses Firebase for auth and image storage. You'll need your own Firebase project.

1. Create a project at https://console.firebase.google.com
2. **Authentication** -> Sign-in method -> enable **Email/Password**
3. **Storage** -> Get started -> production mode -> pick a region
4. **Storage -> Rules:**
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /reports/{userId}/{allPaths=**} {
         allow read: if request.auth != null;
         allow write: if request.auth != null
                      && request.auth.uid == userId
                      && request.resource.size < 5 * 1024 * 1024
                      && request.resource.contentType.matches('image/.*');
       }
     }
   }
   ```
5. **Project settings -> General** -> add a web app, copy the config object
6. **Project settings -> Service accounts** -> generate new private key. Save the JSON file as `backend/firebase-service-account.json`. It's gitignored.

### 3. Start the database

From the repo root:

```bash
docker compose up -d
```

Postgres+PostGIS will run on host port `5433`.

### 4. Backend setup

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` if needed (the default DATABASE_URL points to the Docker container).

Apply migrations and seed reference data:

```bash
alembic upgrade head
python -m app.db.seed
```

Train the AI classifier (synthetic data):

```bash
python -m app.ml.train
```

Pre-download the sentence-transformer model (around 90MB, first time only):

```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

### 5. Frontend setup

```bash
cd ../frontend
npm install
cp .env.example .env
```

Edit `frontend/.env` and paste your Firebase web config values:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_BASE_URL=http://localhost:8000
```

## Startup

Three terminals, run in order:

```bash
# Terminal 1 - database
cd map-report
docker compose up -d

# Terminal 2 - backend API + WebSocket
cd map-report/backend
source .venv/bin/activate
uvicorn app.main:app --reload --reload-dir app --port 8000

# Terminal 3 - frontend
cd map-report/frontend
npm run dev
```

Open http://localhost:5173.

## First user, admin promotion

1. Sign up at http://localhost:5173/signup with any email/password
2. Promote yourself to admin:
   ```bash
   cd backend
   source .venv/bin/activate
   python -m scripts.promote_to_admin you@example.com admin
   ```
3. Log out and log back in.
4. You should now see a shield icon and "Admin" link in the top header

## Project structure

```
map-report/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routers: reports, admin, ws, categories
│   │   ├── core/             # config, firebase, security deps
│   │   ├── db/               # SQLAlchemy models, session, seed
│   │   ├── ml/               # classifier training + saved joblib model
│   │   ├── schemas/          # Pydantic request/response shapes
│   │   ├── services/         # business logic: sanitize, classifier, embedder, duplicates
│   │   └── main.py
│   ├── alembic/              # database migrations
│   ├── scripts/              # promote_to_admin, backfill_embeddings
│   ├── requirements.txt
│   └── firebase-service-account.json  # (gitignored)
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout, MapPicker, StatusChip
│   │   ├── lib/              # uploadImage, useReportsSocket
│   │   ├── pages/            # Home, NewReport, MyReports, MapScreen, AdminDashboard, ReportDetail, Login, Signup
│   │   ├── api.js            # axios instance with Firebase ID-token interceptor
│   │   ├── AuthContext.jsx
│   │   ├── firebase.js
│   │   └── App.jsx           # routing + protected/admin route guards
│   └── package.json
├── docker-compose.yml        # local Postgres+PostGIS
├── progress.md               # detailed build progress + test case mapping
└── README.md
```

## Notes

```bash
# Reset the local DB completely (destroys all data)
docker compose down -v
docker compose up -d
cd backend && source .venv/bin/activate
alembic upgrade head
python -m app.db.seed

# Re-train the classifier after editing app/ml/training_data.py
python -m app.ml.train

# Quick look at recent reports
docker compose exec db psql -U mapreport -d mapreport \
  -c "SELECT report_id, category_id, current_status, cluster_id FROM reports ORDER BY report_id DESC LIMIT 10;"
```

## License

Educational use only. Built as a capstone project for CIS 498.
