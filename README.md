
# ACIA — Adaptive Carbon Intelligence Assistant

> **Your Personal AI-Powered Carbon Reduction Copilot**

## Executive Summary

ACIA is not a carbon footprint calculator.

ACIA is a behavioral optimization platform that learns which sustainability actions each user is actually willing to adopt and continuously adapts future recommendations to maximize real-world carbon reduction.

Unlike traditional carbon tracking tools that stop at reporting emissions, ACIA creates a continuous improvement loop:

**Understand → Track → Reduce → Learn → Adapt → Improve**

The platform combines carbon accounting, behavioral intelligence, adaptive recommendations, prediction systems, and Vertex AI powered reasoning to help users make sustainable decisions that are both realistic and effective.

---

## Why Existing Solutions Fail

Most existing carbon applications:

- Focus primarily on measurement.
- Provide generic recommendations.
- Do not learn from user behavior.
- Cannot adapt to changing lifestyles.
- Lack long-term behavior optimization.

ACIA addresses these limitations through adaptive intelligence and behavioral learning.

---

## What Makes ACIA Different

- Behavioral Intelligence Engine
- Adaptive Recommendation Ranking
- Carbon Improvement Index (CII)
- Personalized AI Explanations
- Carbon Prediction & Scenario Planning
- Continuous Learning Loop

---

## Example User Journey

Day 1:
- User completes onboarding.
- Carbon footprint is calculated.
- Personalized recommendations are generated.

Week 1:
- User accepts selected recommendations.
- Behavioral profile updates.

Month 1:
- Carbon footprint trends are visible.
- Recommendation ranking adapts to actual behavior.

Long Term:
- ACIA continuously learns what works.
- Recommendations become increasingly personalized.
- Users can track measurable improvement over time.

---

## Behavioral Intelligence Loop

User Action
→ Recommendation Generated
→ Accept / Reject / Complete
→ Behavioral Learning Update
→ Recommendation Ranking Changes
→ Improved Future Recommendations

This loop transforms ACIA from a reporting tool into a behavioral optimization system.

---



## What is ACIA?

Most carbon footprint applications answer one question: **"What is my carbon footprint?"**

ACIA answers a fundamentally different question: **"What should I do next, and what is most likely to actually work for me?"**

ACIA is a behavioral optimization system that continuously learns from user actions and helps individuals reduce their carbon footprint through personalized, adaptive, AI-powered recommendations. It goes beyond measurement to drive real, sustained behavioral change.

### The Core Difference

| Traditional Carbon Apps | ACIA |
|---|---|
| Track → Report | Track → Analyze → Predict → Recommend → Learn → Adapt |
| Generic recommendations | Personalized recommendations ranked by your behavioral history |
| Static calculations | Adaptive intelligence that evolves with the user |
| CO₂ numbers only | CO₂e (CO₂ equivalent) including methane, sourced from IPCC AR6 |
| No memory | Never re-shows recommendations you've already rejected |

---

## Live Application

| Service | URL |
|---|---|
| **Frontend** | https://acia-carbon-assistant.web.app |
| **Backend API** | https://acia-backend-686907713091.us-central1.run.app |
| **Health Check** | https://acia-backend-686907713091.us-central1.run.app/health |

---

## Problem Statement Alignment

> *"Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights."*

ACIA addresses every dimension of the problem statement:

### UNDERSTAND
- **Category-wise CO₂e breakdown** across Transport, Energy, Food, and Shopping
- **AI-powered Category Explainer** — Vertex AI generates step-by-step calculation breakdowns citing exact emission factors and sources
- **Benchmark context** — compares your footprint to the global average (375 kg CO₂e/month) and Paris Agreement target (167 kg CO₂e/month)
- All values expressed in **kg CO₂e** (CO₂ equivalent including methane via IPCC AR6 GWP100 factors)

### TRACK
- **Multi-period timeline charts** — Daily, Weekly, Monthly, Yearly
- **Carbon Budget System** — monthly budget = current footprint × 0.90 with real-time progress indicator
- **Trend detection** — automatically classifies emissions as increasing/stable/decreasing
- **Period-over-period comparison** with per-category visual bars
- **Manual activity logging** — car trips, flights, meals, purchases

### REDUCE
- **Adaptive Recommendation Engine** with 16 templates across 4 categories
- **5-dimension scoring** per recommendation:
  - Adoption Probability (35% weight — highest, because ignored = zero reduction)
  - Carbon Impact (30%)
  - Affordability (15%)
  - Convenience (10%)
  - Lifestyle Compatibility (10%)
- **Template Memory System** — rejected recommendations are never shown again after 2 rejections
- **Carbon Impact Simulator** — interactive "what if" scenarios for 4 lifestyle changes
- **Scenario Planner** — combine multiple actions, see combined impact and milestone achievement dates

### PERSONALIZE
- **Vertex AI Gemini 2.5 Flash** with user-specific system prompt injection
- Verified personalized response from live testing:
  > *"Your biggest source of emissions is transport, which accounts for 58% of your total carbon footprint. This currently amounts to 419.7 kg CO₂e per month, largely driven by your 18.0 km daily car commute."*
- **Behavioral Learning Engine** — weight updates after every accept/reject/complete/fail action
- **Weekly AI Narrative** — personalized 3-sentence carbon story generated by Vertex AI

---

## Architecture


┌─────────────────────────────────────────────────────────────────┐
│ CLIENT LAYER │
│ React 18 + TypeScript + Vite + Tailwind CSS │
│ Firebase Auth SDK │ Firebase Analytics SDK │
└─────────────────────────────┬───────────────────────────────────┘
│ HTTPS / REST
│ Authorization: Bearer <Firebase JWT>
┌─────────────────────────────▼───────────────────────────────────┐
│ API GATEWAY LAYER │
│ FastAPI on Google Cloud Run (Python 3.11) │
│ Auth Middleware │ Rate Limiter │ Input Validation │
│ CORS Policy │ Request Logging │ Rate Limit Headers │
└──────┬──────────┬───────────┬──────────────┬────────────────────┘
│ │ │ │
┌──────▼──┐ ┌────▼────┐ ┌────▼────┐ ┌──────▼──────┐
│ Carbon │ │ Recom- │ │ AI │ │ Prediction │
│ Engine │ │mendation│ │Assistant│ │ Engine │
│ Service │ │ Service │ │ Service │ │ Service │
└──────┬──┘ └────┬────┘ └────┬────┘ └──────┬──────┘
│ │ │ │
┌──────▼──────────▼───────────▼──────────────▼──────────────────┐
│ DOMAIN LAYER │
│ Emission Factors │ Scoring Algorithms │ Behavioral Models │
│ (Pure functions — no framework dependencies) │
└──────────────────────────────┬─────────────────────────────────┘
│
┌──────────────────────────────▼─────────────────────────────────┐
│ INFRASTRUCTURE LAYER │
│ Cloud Firestore │ Vertex AI Gemini │ Firebase Admin SDK │
└─────────────────────────────────────────────────────────────────┘


### Clean Architecture Layers

| Layer | Responsibility | Key Files |
|---|---|---|
| **API** | Request routing, auth, validation, rate limiting | `api/routes/*.py`, `api/middleware/*.py` |
| **Services** | Business logic orchestration | `services/*.py` |
| **Domain** | Pure algorithms, emission factors, models | `domain/` |
| **Infrastructure** | Firestore, Vertex AI, Firebase Admin | `infrastructure/` |

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript (strict) | UI framework with zero `any` types |
| Vite | Build tool with code splitting and tree shaking |
| Tailwind CSS | Utility-first styling with custom ACIA design system |
| React Query | Server state management with 5-minute caching |
| Recharts | Emission timeline, prediction, and CII trend charts |
| Zustand | Auth state management |
| react-hot-toast | Non-blocking user feedback |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI (Python 3.11) | High-performance async API framework |
| Pydantic v2 | Request/response validation with strict field constraints |
| Uvicorn | ASGI server for Cloud Run |
| slowapi | Per-user rate limiting |

### Google Cloud
| Service | Purpose |
|---|---|
| **Vertex AI Gemini 2.5 Flash** | AI assistant, weekly narratives, category explainer |
| **Cloud Firestore** | User data, recommendations, behavioral history |
| **Firebase Authentication** | JWT-based auth (Email + Google OAuth) |
| **Cloud Run** | Serverless backend deployment |
| **Firebase Hosting** | Global CDN for frontend |
| **Cloud Logging** | Structured request and error logging |
| **Firebase Analytics** | User behavior event tracking |

---

## Core Features

### 1. Carbon Understanding Engine
Calculates per-category CO₂e emissions from lifestyle inputs using authoritative emission factors.

**Emission Sources:**
- **Transport:** UK Government GHG Conversion Factors 2023 (petrol: 0.21 kg CO₂e/km, transit: 0.089 kg CO₂e/km)
- **Food:** IPCC AR6 + Poore & Nemecek 2018 (beef: 6.0 kg CO₂e/meal including methane)
- **Energy:** UK Government GHG Conversion Factors 2023 (grid: 0.233 kg CO₂e/kWh, renewable: 0.012)
- **Shopping:** Berners-Lee 2020 lifecycle analysis

### 2. Adaptive Recommendation Engine
The core intelligence system. Five-dimension scoring ranks recommendations by the composite score weighted to maximize actual adoption.

```python
composite = (
    adoption_probability × 0.35 +  # Highest — ignored recs = zero reduction
    carbon_impact       × 0.30 +
    cost_score          × 0.15 +
    convenience_score   × 0.10 +
    lifestyle_score     × 0.10
)
```

Template Memory System: Every recommendation template has a unique stable ID tracked in Firestore. After 2 rejections, the template is permanently filtered. The system never re-shows what you've already rejected.

### 3. Behavioral Learning Engine
Updates per-category and per-sub-type weights after every user interaction.

Action	Category Delta	Sub-type Delta
Completed	+0.25	+0.30 (strongest positive)
Accepted	+0.15	+0.20
Failed	-0.10	-0.15
Rejected	-0.20	-0.25 (strongest negative)
Deferred	0.00	0.00 (neutral)
Weekly decay of 5% toward neutral prevents permanent category exclusion.

### 4. Future Carbon Prediction Engine
Projects 6 or 12-month emission trajectory using linear regression on recent data.

Red line (dashed): Current trajectory if behavior continues
Green line (solid): Reduction path with top recommendations adopted
Green line is always meaningful — minimum 20% floor prevents display bugs
### 5. Carbon Impact Simulator
Interactive "what if" scenarios with verified CO₂e calculations:

Replace car trips with public transport
Reduce meat consumption
Work remotely
Switch to renewable energy
Scenario Planner: Combine multiple actions to see combined monthly/annual savings and milestone achievement dates (When do you reach the Paris Agreement target?).

### 6. AI Sustainability Assistant
Vertex AI Gemini 2.5 Flash with user-specific system prompt injection. Every response references the user's actual data — not generic advice.

System prompt injects:

Daily commute distance and transport mode
Monthly CO₂e by category
CII score and primary emission source
Behavioral history and declined categories
### 7. Carbon Improvement Index (CII)
Composite score (0-100) measuring the sustainability journey, not just emissions.

Sub-score	Weight	What It Measures
Awareness	25%	Engagement with understanding emissions
Action	25%	Accepting and completing recommendations
Consistency	25%	Sustained behavioral engagement over time
Improvement	25%	Measurable emission reductions
### 8. Carbon Budget System
Monthly budget = current footprint × 0.90 (10% reduction target)

Real-time progress bar showing daily rate vs budget
Status: On Track / Close to Limit / Over Budget
Drives commitment through the financial budget metaphor

Security
Authentication
Firebase Authentication with RS256 JWT (Google public key infrastructure)
All protected endpoints verify token via firebase_admin.auth.verify_id_token()
User ID extracted from verified token only — never from request parameters
Data Isolation
JavaScript

// Firestore Security Rules — Default deny-all
match /{document=**} {
  allow read, write: if false;  // Deny everything not explicitly granted
}

// User data: UID-isolated
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
API Security
Protection	Implementation
Rate limiting	20 AI requests/hour, 100 general requests/minute per user
Input validation	Pydantic Field constraints (ge=0, le=2000) on all inputs
CORS	Restricted to specific production frontend domains only
Secret management	All secrets via environment variables, .gitignore enforced
AI safety	BLOCK_MEDIUM_AND_ABOVE for harassment/hate speech
Log privacy	User IDs truncated to 8 characters in all log entries
HTTP Security Headers
JSON

"X-Frame-Options": "DENY",
"X-Content-Type-Options": "nosniff",
"Referrer-Policy": "strict-origin-when-cross-origin",
"Permissions-Policy": "camera=(), microphone=(), geolocation=()"
Accessibility

ACIA follows accessibility-focused design principles including keyboard navigation, ARIA support, reduced motion support, focus management, and inclusive UI practices.

---

### Local Development
Prerequisites
Python 3.11+
Node.js 18+
Google Cloud SDK
Firebase CLI
Backend Setup
Bash

cd backend

### Create virtual environment
python -m venv .venv
.venv\Scripts\activate.bat  # Windows
source .venv/bin/activate   # Linux/Mac

### Install dependencies
pip install -r requirements.txt

### Configure environment
cp .env.example .env
#### Fill in .env with your Firebase and Google Cloud credentials

### Run development server
uvicorn main:app --reload --port 8000
Frontend Setup
Bash

cd frontend

### Install dependencies
npm install

### Configure environment
cp .env.example .env.local
#### Fill in .env.local with Firebase config values

### Run development server
npm run dev

## Environment Variables
#### Backend (backend/.env):

FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
VERTEX_AI_PROJECT_ID=your-project-id
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.5-flash
ENVIRONMENT=development

#### Frontend (frontend/.env.local):

VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_BASE_URL=http://localhost:8000

### Deployment
#### Backend — Google Cloud Run
Bash

gcloud run deploy acia-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account=acia-backend-sa@PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars="ENVIRONMENT=production,FIREBASE_PROJECT_ID=PROJECT_ID,VERTEX_AI_PROJECT_ID=PROJECT_ID"

#### Frontend — Firebase Hosting
Bash

cd frontend
npm run build
cd ..
firebase deploy --only hosting

### Key Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/v1/profile/setup | Initial onboarding — calculates first CO₂e footprint |
| GET | /api/v1/carbon/summary | Dashboard summary with benchmarks and trend |
| GET	| /api/v1/carbon/history | Emission history (daily/weekly/monthly/yearly) |
| GET |	/api/v1/recommendations	| Ranked personalized recommendations |
| POST | /api/v1/behavior/feedback | Behavioral feedback (accept/reject/complete/fail) |
| POST | /api/v1/simulator/run | Run a single lifestyle change simulation |
| POST | /api/v1/simulator/plan |	Multi-action scenario plan with milestone dates |
| GET | /api/v1/prediction/trajectory |	12-month emission trajectory |
| POST | /api/v1/assistant/chat |	AI sustainability assistant (rate limited 20/hr) |
| GET |	/api/v1/cii/current |	Carbon Improvement Index score |
| POST | /api/v1/narrative/generate |	Generate AI weekly carbon narrative |
| POST | /api/v1/explainer/category |	AI explanation for category calculation |


### Emission Factors — Scientific Sources
All CO₂e calculations use peer-reviewed, government-verified sources:

| Category | Source |	Key Values |
|---|---|---|
| Transport | UK Government GHG Conversion Factors 2023 |	Petrol: 0.21, Diesel: 0.17, EV: 0.05, Bus: 0.089 kg CO₂e/km |
| Energy | UK Government GHG Conversion Factors 2023 | Grid: 0.233, Renewable: 0.012, Gas: 0.184 kg CO₂e/kWh |
| Food | IPCC AR6 WG3 (2022) + Poore & Nemecek (2018) | Beef: 6.0, Chicken: 0.9, Vegan meal: 0.2 kg CO₂e/meal |
| Shopping | Berners-Lee (2020) "How Bad Are Bananas?" |Moderate shopping: 35 kg CO₂e/month baseline |

All food values use kg CO₂e including methane (CH₄, GWP100 = 27.9) from livestock enteric fermentation as per IPCC AR6. This is scientifically correct and significantly higher than CO₂-only values for red meat.


### The Behavioral Intelligence Loop

User completes onboarding
         │
         ▼
Carbon Engine calculates CO₂e breakdown
         │
         ▼
Recommendation Engine generates top 5 (filtered by memory system)
         │
         ▼
User accepts / rejects / completes
         │
         ▼
Behavioral Learning Engine updates weights
  accept  → category +0.15, sub-type +0.20
  reject  → category -0.20, sub-type -0.25
  complete→ category +0.25, sub-type +0.30
         │
         ▼
Template Memory System records interaction
  2 rejections → template permanently filtered
         │
         ▼
Next recommendation request uses updated weights
  → Different recommendations ranked differently
  → Rejected templates never shown again
         │
         ▼
CII Score updates reflecting behavioral change
         │
         └── Loop continues, system learns, user improves
