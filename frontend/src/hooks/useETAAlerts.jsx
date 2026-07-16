import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ETAAlertContext = createContext({
  toasts: [],
  removeToast: () => {}
});

const playAlertSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.error("Audio playback failed (interaction required)", err);
  }
};

const showSystemNotification = (title, body) => {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    });
  }
};

export const ETAAlertProvider = ({ children }) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const previousAlertsRef = useRef(new Map()); // Map of subscriptionId -> boolean (alertTriggered)
  
  // Ask for notification permission early if passenger
  useEffect(() => {
    if (user?.role === 'user' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = (title, body) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, title, body }]);
    setTimeout(() => removeToast(id), 6000); // Auto remove after 6s
  };

  useEffect(() => {
    // Only poll for passengers (role is 'user')
    if (!user || user.role !== 'user') return;

    let ignore = false;
    
    const checkAlerts = async () => {
      try {
        const response = await apiFetch('/api/notifications');
        if (!response.ok) return;
        const data = await response.json();
        
        if (ignore) return;
        
        const subscriptions = data.subscriptions || [];
        const currentAlerts = new Map();

        subscriptions.forEach(sub => {
          const wasTriggered = previousAlertsRef.current.get(sub._id);
          const isTriggered = sub.alertTriggered;
          
          currentAlerts.set(sub._id, isTriggered);

          // If alert transitioned from false/undefined to true
          if (isTriggered && !wasTriggered) {
            const busLabel = sub.nearestBus?.registrationNumber ? `Bus ${sub.nearestBus.registrationNumber}` : 'A bus';
            const routeName = sub.routeId?.routeName || 'your route';
            const stopName = sub.stopId?.name || 'your stop';
            const eta = sub.nearestBus?.eta_minutes;
            
            const title = `ETA Alert: ${eta} mins away!`;
            const body = `${busLabel} on ${routeName} is approaching ${stopName}.`;
            
            // Trigger visual and audio feedback
            playAlertSound();
            showSystemNotification(title, body);
            addToast(title, body);
          }
        });

        previousAlertsRef.current = currentAlerts;
        
      } catch (err) {
        console.error("Failed to check ETA alerts", err);
      }
    };

    // Initial check
    checkAlerts();
    
    // Poll every 30 seconds
    const intervalId = setInterval(checkAlerts, 30000);
    
    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, [user]);

  return (
    <ETAAlertContext.Provider value={{ toasts, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-20 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="pointer-events-auto bg-[#0d111b] border border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.15)] rounded-2xl p-4 w-80 animate-fade-in-up flex flex-col gap-1"
          >
            <div className="flex justify-between items-start">
              <strong className="text-emerald-500 font-bold text-sm">{toast.title}</strong>
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">{toast.body}</p>
          </div>
        ))}
      </div>
    </ETAAlertContext.Provider>
  );
};

export const useETAAlerts = () => useContext(ETAAlertContext);
