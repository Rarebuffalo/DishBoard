# Dish Board

A full-stack application designed to manage dish publishing states with real-time updates. The system uses a PostgreSQL database trigger to notify the FastAPI backend of changes, which then broadcasts those updates to the React dashboard over WebSockets. This ensures the dashboard reflects updates immediately, even if changes are made directly in the database.

## System Architecture

```text
React Dashboard (Frontend)
      │
  REST API / WebSockets
      │
   FastAPI (Backend)
      │
  SQLAlchemy Sync
      │
  PostgreSQL (Database)
      │
  LISTEN / NOTIFY Trigger
```

* **Frontend:** Built with React, TypeScript, and Tailwind CSS. It communicates with the backend via REST endpoints for fetching/toggling state, and maintains a persistent WebSocket connection for real-time synchronization.
* **Backend:** Built with FastAPI. It handles REST requests using SQLAlchemy (sync) to query and update the database, and hosts a WebSocket server.
* **Real-time Engine:** A PostgreSQL trigger function listens for database changes (inserts or updates). Upon detection, it calls `pg_notify` to send the new row payload to a channel. The FastAPI backend runs an asynchronous background worker that subscribes to this channel and broadcasts all received payloads to all active WebSocket clients.

---

## Getting Started

### Database Setup

1. Create a PostgreSQL database (e.g. on your local machine or via a cloud host like Neon).
2. Configure your connection string in the environment variables (see Backend configuration below).

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the `backend` directory (refer to `.env.example` if available) and add your database URL:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/dishboard
   ```

5. Run the seeding script to initialize the tables, install the trigger functions, and populate mock data:
   ```bash
   python seed.py
   ```

6. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will run at `http://localhost:8000`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Configure your API base URLs in a `.env` file if needed, or rely on the defaults:
   ```env
   VITE_API_BASE=http://localhost:8000
   VITE_WS_BASE=ws://localhost:8000
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run at `http://localhost:5173`.

---

## Verifying Real-Time Updates

### Tab-to-Tab Synchronization
1. Open the dashboard at `http://localhost:5173` in two separate browser windows side-by-side.
2. Click the toggle button (Publish/Unpublish) on any dish card in one window.
3. Observe that the state and count updates instantly in both windows.

### Direct Database Update (Bonus Objective)
1. Keep the dashboard open in your browser.
2. Open a database client or console (`psql`) and execute a direct update statement on the database:
   ```sql
   UPDATE dishes SET is_published = false WHERE dish_name = 'Margherita Pizza';
   ```
3. Observe that the dashboard immediately reflects the state transition and updates the counters at the top, without needing a page refresh or manual trigger.
