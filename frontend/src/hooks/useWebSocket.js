import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = () => {
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

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Dynamically match current host (proxied via Vite /api in dev, mapped to root in prod)
    const wsUrl = `${wsProtocol}//${window.location.host}/api/locations/livewebsocket`;

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
          setLocations((prev) => ({
            ...prev,
            [msg.busId]: {
              lat: msg.lat,
              lng: msg.lng,
              speed_kmh: msg.speed_kmh,
              heading_deg: msg.heading_deg,
              timestamp: msg.timestamp
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

  // Send subscribe request
  const subscribe = useCallback((busIds) => {
    if (!Array.isArray(busIds) || busIds.length === 0) return;
    
    // Add to local trackers
    busIds.forEach(id => subscribedBusesRef.current.add(id));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', busIds }));
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

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Remove close listener to prevent loop on teardown
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, locations, subscribe, unsubscribe };
};
export default useWebSocket;
