# Dish Board - Real-Time Management Dashboard

A full-stack, real-time management dashboard designed to synchronize menu visibility states ("dishes") across restaurant interfaces. The application leverages a database-first event pipeline: changes made to the PostgreSQL database (either via the admin dashboard or directly in a SQL client) trigger immediate, low-latency UI updates in all open client browsers via FastAPI WebSockets.

---

## Technical Architecture & Core Logic

A detailed breakdown of the components, database triggers, connection managers, and React hooks is available in:
**[documentation/ARCHITECTURE.md](file:///home/Krishna-Singh/DishBoard/documentation/ARCHITECTURE.md)**

### Core Event Flow
1. **Mutation**: A dish is toggled in the React UI (`PATCH` endpoint) or modified directly inside database CLI (`psql`).
2. **Notification**: PostgreSQL trigger detects the change `AFTER UPDATE` and executes `pg_notify` to send a JSON payload over the `dish_updates` channel.
3. **Ingestion**: An async background worker (`asyncpg`) in the FastAPI backend listens on the channel, captures the payload, and validates it using Pydantic.
4. **Broadcast**: The backend broadcasts the change to all active clients currently connected via a persistent WebSocket (`/ws`).
5. **Re-Render**: The React frontend updates its local list state, automatically recalculating dashboard counters and updating card badges dynamically.

---

## Directory Structure

```text
DishBoard/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── database.py       # SQLAlchemy Connection Setup
│   │   ├── main.py           # Application Entrypoint & asyncpg Worker
│   │   ├── models.py         # SQLAlchemy Models
│   │   ├── routes.py         # REST GET / PATCH endpoints
│   │   ├── schemas.py        # Pydantic Schemas (camelCase aliases)
│   │   └── websocket.py      # Connection Manager for WebSockets
│   ├── requirements.txt      # Python Dependencies (includes websockets)
│   └── seed.py               # Table creation & trigger seeding script
├── docs/                     # Video/Image Media Assets
├── documentation/            # Detailed Architecture & Technical Specs
├── frontend/                 # React Single Page App (TypeScript & Vite)
│   ├── src/
│   │   ├── components/       # UI Components (DishCard)
│   │   ├── App.tsx           # Main Dashboard and WS state integration
│   │   └── index.css         # Tailwind directives
│   └── package.json          # Node dependencies (React 19, tailwindcss v3)
├── start-db.sh               # Local PostgreSQL startup script
└── README.md                 # Project Setup & Running guide
```

---

## Prerequisites

Ensure you have the following installed on your machine:
* **Python 3.10+** (with `pip` and `venv`)
* **Node.js 18+** (with `npm`)
* **PostgreSQL** (if you want to run your own custom PG database instance; otherwise, the repository includes a script to start a local database directly inside the project root)

---

## Installation & Running

Follow these steps in separate terminal tabs to run the application locally:

### Step 1: Start the PostgreSQL Database
We have included a startup script `start-db.sh` that initializes and executes a local PostgreSQL instance within the project's data directory:
```bash
./start-db.sh
```
*Note: This starts Postgres on port `5433` using the socket directory `pgdata/run`.*

### Step 2: Set up & Run the Backend API

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure the environment variables in a `.env` file inside the `backend/` directory:
   ```env
   DATABASE_URL=postgresql+psycopg://myuser:mypassword@/dishboard?host=/home/Krishna-Singh/DishBoard/pgdata/run&port=5433
   ```
5. Run the seeding script to compile SQL tables, insert trigger logic, and seed 6 mock dishes:
   ```bash
   python seed.py
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The backend REST API and WS channel will be active at `http://localhost:8000`.*

### Step 3: Set up & Run the Frontend UI

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages (use `--legacy-peer-deps` to handle React 19 dependency resolution):
   ```bash
   npm install --legacy-peer-deps
   ```
3. Configure the environment variables in a `.env` file inside the `frontend/` directory (optional - defaults to local development):
   ```env
   VITE_API_BASE=http://localhost:8000
   VITE_WS_BASE=ws://localhost:8000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will run at `http://localhost:5173`.*

---

## Testing & Verification

### 1. Verification of Real-Time Sync (Dashboard to Dashboard)
1. Open `http://localhost:5173` in two separate web browser windows side-by-side.
2. Click the **Publish** or **Unpublish** toggle button on any dish card in the first window.
3. Verify that:
   - The status badge changes status instantly in both windows.
   - The counters (Total, Published, Unpublished) in the header adjust immediately on both clients.
   - No browser reload is required.

### 2. Verification of Database-First Sync (Database to Dashboard)
1. Keep the dashboard open in a browser tab.
2. Open a terminal and connect to your running PostgreSQL instance on port `5433`:
   ```bash
   psql -h 127.0.0.1 -p 5433 -U myuser -d dishboard
   ```
3. Run a SQL update statement to manually toggle the publishing status of a dish:
   ```sql
   UPDATE dishes SET is_published = false WHERE dish_name = 'Margherita Pizza';
   ```
4. Verify that the Margherita Pizza card immediately slides back into the **Unpublished** state and the published count updates to reflect the database state in real-time.

---

## Demo Video

The recorded video showing real-time dashboard-to-dashboard and database-to-dashboard synchronization can be viewed here:
**[Watch the Demo Video on Google Drive](https://drive.google.com/file/d/1l2ezVEnUgEJ-w6M6zVeGvQxgXQPXHgm1/view?usp=sharing)**
