import asyncio
import json
import asyncpg
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .database import DATABASE_URL
from .websocket import manager
from .schemas import DishOut
from .routes import router as dishes_router

async def process_and_broadcast(payload: str):
    """Parse direct DB notification payload, map to camelCase, and broadcast to clients."""
    try:
        raw_dish = json.loads(payload)
        
        # Pydantic validation handles snake_case -> camelCase mapping
        dish_out = DishOut.model_validate(raw_dish)
        serialized_dish = dish_out.model_dump(by_alias=True)
        
        await manager.broadcast_json({
            "event": "dish_updated",
            "dish": serialized_dish
        })
    except Exception as e:
        print(f"Error processing db notification payload: {e}")

async def postgres_listener():
    """Background loop that connects to Postgres and listens for table updates."""
    while True:
        try:
            # Establish direct async connection for LISTEN/NOTIFY
            conn = await asyncpg.connect(DATABASE_URL)
            
            def handle_notification(connection, pid, channel, payload):
                # Process notification in a non-blocking background task
                asyncio.create_task(process_and_broadcast(payload))
                
            await conn.add_listener("dish_updates", handle_notification)
            print("PostgreSQL listener actively subscribed to 'dish_updates'")
            
            while True:
                await asyncio.sleep(10)
                # Ping query to keep connection active
                await conn.execute("SELECT 1")
                
        except asyncio.CancelledError:
            print("PostgreSQL listener task cancelled.")
            break
        except Exception as e:
            print(f"PostgreSQL listener error: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start listening to DB notifications
    listener_task = asyncio.create_task(postgres_listener())
    yield
    # Shutdown: Clean up background tasks
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Dish Board API",
    description="Backend API with PostgreSQL triggers and real-time WebSockets",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API endpoints
app.include_router(dishes_router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Exposes real-time sync WebSocket channel."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
