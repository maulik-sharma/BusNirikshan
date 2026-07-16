import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// ─── Context ────────────────────────────────────────────────────────────────
const WebSocketContext = createContext(null);

// ─── Provider (mount ONCE at app root) ──────────────────────────────────────
export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [locations, setLocations] = useState({}); // busId -> location update data

  const wsRef = useRef(null);
  const subscribedBusesRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);

  // Establish connection
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || '';
    let wsUrl;
    if (baseUrl) {
      wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/locations/livewebsocket';
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProtocol}//${window.location.host}/api/locations/livewebsocket`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connection opened');
      setIsConnected(true);

      // Re-subscribe to any previously active buses (e.g. after network drop)
      if (subscribedBusesRef.current.size > 0) {
        const busIds = Array.from(subscribedBusesRef.current);
        ws.send(JSON.stringify({ type: 'subscribe', busIds }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'location') {
          console.log(`[WS] Received location for bus ${msg.busId}:`, msg.lat, msg.lng);
          setLocations((prev) => ({
            ...prev,
            [msg.busId]: {
              ...prev[msg.busId],
              lat: msg.lat,
              lng: msg.lng,
              speed_kmh: msg.speed_kmh,
              heading_deg: msg.heading_deg,
              timestamp: msg.timestamp
            }
          }));
        } else if (msg.type === 'status') {
          console.log(`[WS] Received status for bus ${msg.busId}: isActive=${msg.isActive}`);
          setLocations((prev) => ({
            ...prev,
            [msg.busId]: {
              ...prev[msg.busId],
              isActive: msg.isActive
            }
          }));
        } else if (msg.type === 'error') {
          console.warn('[WS] Error from server:', msg.message);
        } else if (msg.type === 'ack') {
          console.log(`[WS] Ack: ${msg.action} for`, msg.busIds);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message payload:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Connection closed');
      setIsConnected(false);

      // Trigger reconnect backoff after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('[WS] WebSocket error:', error);
      ws.close();
    };
  }, []);

  // Send subscribe request (idempotent — skips already-subscribed IDs)
  const subscribe = useCallback((busIds) => {
    if (!Array.isArray(busIds) || busIds.length === 0) return;

    // Only subscribe to IDs we aren't already tracking
    const newIds = busIds.filter(id => !subscribedBusesRef.current.has(id));
    newIds.forEach(id => subscribedBusesRef.current.add(id));

    if (newIds.length > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', busIds: newIds }));
    }
  }, []);

  // Send unsubscribe request
  const unsubscribe = useCallback((busIds) => {
    if (!Array.isArray(busIds) || busIds.length === 0) return;

    // Remove from local trackers
    busIds.forEach(id => {
      subscribedBusesRef.current.delete(id);
      // Evict tracked location data state
      setLocations((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', busIds }));
    }
  }, []);

  // Connect once when the provider mounts (app root — never unmounts)
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;

        if (wsRef.current.readyState === WebSocket.CONNECTING) {
          // Defer close until handshake completes to avoid ECONNABORTED
          const ws = wsRef.current;
          ws.onopen = () => { ws.onclose = null; ws.close(); };
        } else {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  const value = { isConnected, locations, subscribe, unsubscribe };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// ─── Consumer hook (use in any component) ───────────────────────────────────
export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used within a <WebSocketProvider>');
  }
  return ctx;
};

export default useWebSocket;
