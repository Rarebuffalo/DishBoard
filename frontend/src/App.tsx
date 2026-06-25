import { useEffect, useState } from 'react';
import axios from 'axios';
import { type Dish, DishCard } from './components/DishCard';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';

function App() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // Fetch initial dishes list from the REST API
  const fetchDishes = async () => {
    try {
      setLoading(true);
      const response = await axios.get<Dish[]>(`${API_BASE}/api/dishes`);
      setDishes(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dishes:', err);
      setError('Failed to load dishes. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
  }, []);

  // Establish WebSocket connection and handle real-time broadcasts
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: number;

    const connectWebSocket = () => {
      setWsStatus('connecting');
      ws = new WebSocket(`${WS_BASE}/ws`);

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setWsStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'dish_updated' && data.dish) {
            const updatedDish: Dish = data.dish;
            setDishes((prevDishes) =>
              prevDishes.map((dish) =>
                dish.dishId === updatedDish.dishId ? updatedDish : dish
              )
            );
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed. Attempting reconnect...');
        setWsStatus('disconnected');
        // Attempt reconnection in 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Handle manual toggle button clicks from the dashboard
  const handleToggle = async (dishId: number) => {
    // Add to toggling set to disable button
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(dishId);
      return next;
    });

    try {
      const response = await axios.patch<Dish>(`${API_BASE}/api/dishes/${dishId}/toggle`);
      const updatedDish = response.data;
      
      // Update local state immediately for a snappy user experience
      setDishes((prevDishes) =>
        prevDishes.map((dish) => (dish.dishId === dishId ? updatedDish : dish))
      );
    } catch (err: any) {
      console.error('Error toggling dish status:', err);
      alert('Failed to update dish status. Please try again.');
    } finally {
      // Remove from toggling set
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(dishId);
        return next;
      });
    }
  };

  // Compute live counters
  const totalCount = dishes.length;
  const publishedCount = dishes.filter((d) => d.isPublished).length;
  const unpublishedCount = totalCount - publishedCount;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dish Board</h1>
              <p className="text-xs text-slate-500">Real-time status management</p>
            </div>
          </div>
          
          {/* WebSocket Connection Indicator */}
          <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-500 animate-bounce'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-600 capitalize">
              Real-time Sync: {wsStatus === 'connected' ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
            <button
              onClick={fetchDishes}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Live Status Counters */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Items</p>
              <h4 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : totalCount}</h4>
            </div>
            <span className="p-3 bg-slate-100 rounded-lg text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Published</p>
              <h4 className="text-2xl font-bold text-emerald-600 mt-1">{loading ? '...' : publishedCount}</h4>
            </div>
            <span className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Unpublished</p>
              <h4 className="text-2xl font-bold text-slate-600 mt-1">{loading ? '...' : unpublishedCount}</h4>
            </div>
            <span className="p-3 bg-slate-50 rounded-lg text-slate-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
        </section>

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-slate-600 text-sm font-medium">Retrieving latest dishes...</span>
          </div>
        ) : (
          /* Dish Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {dishes.map((dish) => (
              <DishCard
                key={dish.dishId}
                dish={dish}
                onToggle={handleToggle}
                isToggling={togglingIds.has(dish.dishId)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
