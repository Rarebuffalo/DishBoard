# System Architecture & Technical Specifications

This document details the end-to-end architecture, business logic, component implementation, and transaction flow of the Dish Board application.

---

## 1. Business Logic & Requirements

The primary objective of the Dish Board application is to manage the visibility and publishing status of menu items ("dishes") across a restaurant's digital touchpoints.

### Core Business Logic
* **Menu Visibility Management**: Restaurant administrators can toggle the state of a dish between `Published` (visible to customers) and `Unpublished` (hidden from customers).
* **Multi-Client State Synchronization**: If multiple administrators or clients have the dashboard open, any state transition triggered by one user must immediately reflect on all other active screens without page reloads.
* **Database-First Integrity**: The application must not rely solely on the backend REST API to push real-time updates. If a developer, cron job, or external integration updates a dish's status directly in the PostgreSQL database (via `psql` or an external service), the change must be broadcast to the UI automatically in real time.

---

## 2. Technical System Topology

To satisfy the real-time, database-first requirement, the system uses a unidirectional event-driven push architecture:

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 1. Database Layer (PostgreSQL)                                         │
 │                                                                        │
 │  Trigger fires AFTER UPDATE ────► Trigger Function (pg_notify)        │
 └──────────────────────────────────────────┬─────────────────────────────┘
                                            │
                                            │ (PostgreSQL LISTEN/NOTIFY)
                                            ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 2. Backend API Layer (FastAPI)                                         │
 │                                                                        │
 │  [lifespan startup] ──► asyncpg Listener Worker ──► ConnectionManager   │
 └─────────────────────────────────────────────────────────┬──────────────┘
                                                           │
                                                           │ (WebSockets /ws)
                                                           ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 3. Client UI Layer (React)                                             │
 │                                                                        │
 │  WebSocket Handler ──► useState (Dishes) ──► Re-render (Stats & Cards) │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer-by-Layer Technical Implementation

### A. Database Layer (PostgreSQL)

The database acts as the single source of truth and the initial event emitter.

#### 1. Schema Definition
The database table `dishes` is defined as follows:
* `dish_id` (SERIAL Primary Key): Numeric, auto-incrementing identifier.
* `dish_name` (VARCHAR(255), Not Null): The name of the dish.
* `image_url` (TEXT, Not Null): Fully-qualified URL pointing to the dish's display image.
* `is_published` (BOOLEAN, Not Null, Default `FALSE`): The publication state.

#### 2. PostgreSQL Triggers
To enable database-first real-time behavior, we use PostgreSQL's built-in `LISTEN/NOTIFY` protocol. An `AFTER UPDATE` trigger is configured on the `dishes` table. Whenever a row's column is modified, the trigger constructs a JSON payload containing the updated row values and sends a notify event to the `dish_updates` channel:

```sql
-- Trigger Function
CREATE OR REPLACE FUNCTION notify_dish_update()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'dish_updates',
    json_build_object(
      'dish_id', NEW.dish_id,
      'dish_name', NEW.dish_name,
      'image_url', NEW.image_url,
      'is_published', NEW.is_published
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Association
CREATE TRIGGER dish_update_trigger
AFTER UPDATE ON dishes
FOR EACH ROW
EXECUTE FUNCTION notify_dish_update();
```
*Why this is implemented:* This avoids polling database tables from the application layer, reducing CPU usage, connection overhead, and latency down to milliseconds.

---

### B. Backend Layer (FastAPI)

The backend handles dual workloads: standard REST transactions via SQLAlchemy (synchronous) and persistent WebSocket loops.

#### 1. Database Connections (Hybrid Model)
* **REST API Transactions**: Managed by a synchronous SQLAlchemy session pool (`SessionLocal`). This is clean, safe, and handles connection teardowns per request cycle using FastAPI dependency injection (`get_db`).
* **LISTEN Worker**: A single persistent asynchronous connection managed by `asyncpg` is used to hook into PostgreSQL's `LISTEN` command. This connection bypasses SQLAlchemy to run a dedicated loop that blocks waiting for DB events.

#### 2. Asynchronous Event Pipeline
On FastAPI application startup, a non-blocking background task (`postgres_listener`) is spawned inside the lifespan context:
1. It registers an `asyncpg` listener on the `"dish_updates"` channel.
2. When the DB trigger emits a payload, `asyncpg` intercepts it and runs the callback function.
3. The callback parses the raw JSON string, deserializes it into a Pydantic `DishOut` schema (which automatically converts `snake_case` keys to `camelCase` aliases), and formats it into a standard JSON broadcast object.
4. The payload is passed to the WebSocket `ConnectionManager`.

#### 3. WebSocket Connection Manager
The `ConnectionManager` class tracks all active WebSocket clients. It exposes:
* `connect()`: Accepts and registers a new WebSocket connection.
* `disconnect()`: Unregisters the connection when a client closes their browser.
* `broadcast_json()`: Loops through the set of active connections and sends the JSON payload asynchronously.

---

### C. Frontend Layer (React & TypeScript)

The frontend is a single-page React app designed for live dashboard usage.

#### 1. State Management & Initialization
On mounting, the `App` component performs a REST `GET` request to retrieve the initial menu state. The dishes are stored in the component's state hook (`dishes`). 

#### 2. Real-Time WebSocket Synchronization
A persistent WebSocket client is instantiated connecting to `ws://localhost:8000/ws`:
* **Event Handlers**: When a message arrives with `event: "dish_updated"`, the listener intercepts it and updates that single item in the `dishes` state array.
* **Auto-Reconnection**: To handle network drops or backend server restarts, the frontend features a recursive reconnection function. If the socket closes, it flags the status as `Disconnected` and retries connection every 3 seconds.
* **Status Banner**: A floating badge on the dashboard indicates connection health (`Connected` in green with a pulse animation, `Connecting...` in amber, or `Disconnected` in red).

#### 3. Recalculated Business Metrics
All counts shown in the dashboard header are calculated dynamically:
* `Total Items`: `dishes.length`
* `Published`: Count of items where `is_published` is `true`.
* `Unpublished`: Count of items where `is_published` is `false`.

Since these counters derive directly from the `dishes` state, they automatically adjust in real time whenever a WebSocket message triggers a state update.
