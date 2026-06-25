# System Architecture & Documentation

This document provides a detailed, end-to-end breakdown of the Dish Board application architecture, explaining how the database, backend, WebSockets, and frontend components interact to achieve real-time synchronization.

---

## 1. System Topology & Flow

The application coordinates data propagation across three layers in a unidirectional real-time event pipeline:

```text
  ┌─────────────────────────────────────────────────────────┐
  │                   PostgreSQL Database                   │
  │                                                         │
  │  [ UPDATE dishes SET is_published = true ]              │
  │                       │                                 │
  │                       ▼                                 │
  │            Trigger Function (pg_notify)                 │
  └───────────────────────┬─────────────────────────────────┘
                          │ (LISTEN/NOTIFY channel)
                          ▼
  ┌─────────────────────────────────────────────────────────┐
  │                    FastAPI Backend                      │
  │                                                         │
  │                asyncpg Background Worker                │
  │                       │                                 │
  │                       ▼                                 │
  │              WebSocket Connection                       │
  └───────────────────────┬─────────────────────────────────┘
                          │ (WebSocket broadcast)
                          ▼
  ┌─────────────────────────────────────────────────────────┐
  │                    React Frontend                       │
  │                                                         │
  │               Client-side State Sync                    │
  │                       │                                 │
  │                       ▼                                 │
  │             UI Updates (Counters & Cards)               │
  └─────────────────────────────────────────────────────────┘
```

### Event Lifecycle Steps:
1. **Triggering Event**: A row in the `dishes` table changes (e.g., via the dashboard UI `PATCH` request or direct manual database modification in `psql`).
2. **Database Notify**: The database runs a trigger function that parses the row, formats it as JSON, and broadcasts a message using `pg_notify` on the `dish_updates` channel.
3. **Backend Listener**: An asynchronous database connection managed by `asyncpg` listens for events on `dish_updates`.
4. **WebSocket Broadcast**: When a database notification arrives, the `asyncpg` callback receives the payload and passes it to the `ConnectionManager`, which broadcasts it to all connected WebSocket clients.
5. **UI Update**: The React client receives the WebSocket message, parses the payload, updates its list state, and recalculates the statistics counters instantly.

---

## 2. Database Design & Trigger

### The `dishes` Schema
The schema is simple and optimized for tracking publication states:
* `dish_id` (Integer, Primary Key): Unique identifier.
* `dish_name` (VARCHAR): Name of the dish.
* `image_url` (TEXT): Link to the hosted image asset.
* `is_published` (Boolean): Current publication status.

### Real-Time Notify Trigger
The real-time updates are driven by a PostgreSQL trigger function installed in the database:

```sql
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

CREATE TRIGGER dish_update_trigger
AFTER UPDATE ON dishes
FOR EACH ROW
EXECUTE FUNCTION notify_dish_update();
```

---

## 3. Backend Implementation (FastAPI)

The backend handles two roles: serving standard REST requests and broadcasting WebSocket events.

### REST Endpoints
* **`GET /api/dishes`**: Fetches the list of all dishes ordered by ID.
* **`PATCH /api/dishes/{dish_id}/toggle`**: Toggles the `is_published` boolean value of the specified dish in the database and commits it.

### The Real-Time WebSocket Channel
* Located at: `ws://localhost:8000/ws`
* A lightweight connection manager tracks all active WebSocket connections. When a client connects, they are stored in an active connections set; when they disconnect, they are cleaned up.

### Background Listener Worker
Using `asyncpg`'s native connection listeners, a non-blocking background task is registered on FastAPI's startup event:

```python
async def postgres_listener():
    # Connect directly using asyncpg
    conn = await asyncpg.connect(**connect_kwargs)
    
    # Register the callback function to receive payloads
    await conn.add_listener("dish_updates", handle_notification)
    
    # Maintain connection
    while True:
        await asyncio.sleep(10)
        await conn.execute("SELECT 1")
```

---

## 4. Frontend Implementation (React)

The frontend is a single-page React client styled with Tailwind CSS, utilizing two custom integrations:

### API Integration (Axios)
Upon mounting, the component fetches all dishes and sets them in the local `useState` array to compute stats.
When the user clicks the "Publish" or "Unpublish" toggle button on a card, a request is sent to `PATCH /api/dishes/{id}/toggle`. The local UI updates instantly on the clicked client to ensure high responsiveness.

### WebSocket Integration
The client opens a persistent connection to `ws://localhost:8000/ws`.
* **State Updates**: When the WebSocket receives a message of type `dish_updated`, the component updates that specific item in the local `dishes` state array.
* **Auto-Reconnection**: If the network connection drops or the server is restarted, the client automatically attempts to reconnect every 3 seconds to keep the sync active.
