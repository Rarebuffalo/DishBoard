# Dish Board

A full-stack application designed to manage dish publishing states with real-time updates. The system uses a PostgreSQL database trigger to notify the FastAPI backend of changes, which then broadcasts those updates to the React dashboard over WebSockets.

<video src="docs/demo.mp4" width="100%" controls muted></video>

Detailed documentation on the event flow, triggers, and components is available in the [ARCHITECTURE.md](file:///home/Krishna-Singh/DishBoard/ARCHITECTURE.md) document.

---

## Quick Start (How to Run)

Follow these steps in separate terminal windows to spin up the local development environment:

### Step 1: Start the PostgreSQL Database
Initialize the database run directory and start the local database server:
```bash
./start-db.sh
```
*The database will start running on port `5433` using the Unix sockets folder configured under `pgdata/run`.*

### Step 2: Start the Backend Server
Activate the Python virtual environment and run the FastAPI server:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```
*The API server will run at `http://localhost:8000`.*

### Step 3: Start the Frontend Application
Start the React Vite development server:
```bash
cd frontend
npm run dev
```
*The frontend dashboard will run at `http://localhost:5173`.*

---

## How to Test

### 1. Tab-to-Tab Synchronization
1. Open the dashboard in two separate browser windows side-by-side (`http://localhost:5173`).
2. Click the **Publish** or **Unpublish** button on any dish card in one window.
3. Observe that the status badge, the action button, and the counters update instantly in both windows.

### 2. Direct Database Update (Real-time Broadcast)
1. Keep the dashboard open in your browser.
2. Open a database client (`psql`) connecting to your local port `5433`:
   ```bash
   psql -h 127.0.0.1 -p 5433 -U myuser -d dishboard
   ```
3. Execute a direct database update query:
   ```sql
   UPDATE dishes SET is_published = false WHERE dish_name = 'Margherita Pizza';
   ```
4. Observe that the dashboard instantly transitions the Margherita Pizza card to **Unpublished** and shifts the statistics counts in real time without refreshing the page.
