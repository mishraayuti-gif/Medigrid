# MindCare AI — Complete AI-Powered Mental Wellness Platform

**Tagline:** Understand Your Mind. Manage Your Stress. Improve Your Life.

MindCare AI is a full-stack mental wellness platform combining deterministic stress scoring, local **Ollama** LLM reflection, **MediaPipe Pose Landmarker** live posture feedback, guided breathing & movement sessions, procedural Web Audio soundscapes, emotion journaling, sleep tracking, and wellness analytics.

---

## Architecture

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), Recharts, React Router, Axios, `@mediapipe/tasks-vision`
- **Backend:** Node.js, Express, TypeScript, Mongoose (MongoDB), JWT authentication, `bcryptjs`, `express-validator`, `express-rate-limit`
- **Local AI (Primary LLM):** Ollama (`POST http://localhost:11434/api/chat`, configurable `OLLAMA_MODEL`, default `llama3.1`)
- **AI Vision Microservice:** Python FastAPI + MediaPipe + OpenCV + NumPy (`/ai-service`)

### Resilient Storage & Offline AI Behavior
- **Database:** Connects to `MONGODB_URI` via Mongoose when MongoDB is running. If MongoDB is unreachable in a sandboxed environment, it automatically activates a local disk-persisted JSON repository (`data/mindcare-db.json`) with seeded demonstration data (`demo@mindcare.ai` / `MindCareDemo2026!`) so every feature remains functional.
- **Ollama AI:** All AI features query Ollama directly from the backend (`backend/services/ollamaService.js`). If Ollama is offline, MindCare AI preserves user input, reports the offline status honestly, and provides deterministic fallback recommendations rather than fabricating AI responses.
- **Posture Monitoring Privacy:** Live MediaPipe posture detection runs transiently in the browser/memory; **no camera video is stored or uploaded by default**, and camera tracks stop immediately when a session ends. Breathing exercises use guided breathing timers rather than claiming webcam-based breathing measurement.

---

## Deterministic Stress Scoring Engine (0–100)

Calculated strictly on the backend (`backend/services/stressScoringEngine.ts`), never invented by an LLM:
- Emotional Load: 0–15 pts
- Active Stressor Breadth: 0–10 pts
- Sleep Deficit: 0–15 pts
- Mental Exhaustion: 0–15 pts
- Focus & Concentration Difficulty: 0–12 pts
- Work / Study Pressure: 0–13 pts
- Anxiety Frequency: 0–12 pts
- Daily Energy Deficit: 0–8 pts

**Categories:** `0–24 Low` · `25–49 Moderate` · `50–74 High` · `75–100 Very High`.  
*Disclaimer: Results are general wellness estimates and not clinical or psychiatric diagnoses.*

---

## Quick Start (Local Development)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
3. **Optional — Start Ollama & pull model:**
   ```bash
   ollama serve
   ollama pull llama3.1
   ```
4. **Run the full-stack server (Express API + Vite on port 3000):**
   ```bash
   npm run dev
   ```
5. **Optional — Run Python FastAPI Microservice:**
   ```bash
   cd ai-service
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
6. **Full Docker Stack:**
   ```bash
   docker-compose up --build
   ```

---

## Key API Endpoints

- `GET /api/health` — Server, database mode, and Ollama connectivity status
- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`, `GET /api/auth/me`
- `POST /api/stress/assessment`, `GET /api/stress/history`, `GET /api/stress/latest`
- `POST /api/emotions`, `GET /api/emotions/history`, `PUT /api/emotions/:id`, `DELETE /api/emotions/:id`
- `GET /api/exercises`, `POST /api/exercises/session`, `GET /api/exercises/history`
- `GET /api/music`, `GET /api/music/recommendations`, `POST /api/music/history`, `GET /api/music/history`
- `POST /api/ai/chat`, `GET /api/ai/conversations`, `DELETE /api/ai/conversations/:id`, `POST /api/ai/analyze-stress`, `POST /api/ai/analyze-journal`, `POST /api/ai/recommend-exercise`, `POST /api/ai/recommend-music`, `GET /api/ai/health`
- `GET /api/dashboard/summary`
- `GET /api/users/profile`, `PUT /api/users/profile`, `GET /api/users/export`, `DELETE /api/users/data`, `DELETE /api/users/account`
- `GET /api/wellness/goals`, `POST /api/wellness/goals`, `PUT /api/wellness/goals/:id`, `DELETE /api/wellness/goals/:id`, `GET /api/wellness/report`
- `POST /api/sleep`, `GET /api/sleep/history`, `DELETE /api/sleep/:id`

---

## Demo Account

- **Email:** `demo@mindcare.ai`
- **Password:** `MindCareDemo2026!`
- Demonstration records are clearly labeled `Demonstration Data` in the UI to distinguish them from newly recorded personal assessments.
