import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) => {
  const [position, setPosition] = useState({
    coordinates: null, // [lng, lat]
    speed_kmh: 0,
    heading_deg: 0,
    error: null
  });
  
  const watcherRef = useRef(null);
  
  // Track state for the filter pipeline across geolocation updates
  const filterStateRef = useRef({
    lastTimestamp: 0,
    smoothedSpeed: 0,
    smoothedHeading: 0,
    initialized: false
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition(prev => ({ ...prev, error: 'Geolocation is not supported by this browser.' }));
      return;
    }

    const successHandler = (pos) => {
      const { latitude, longitude, speed, heading } = pos.coords;
      const timestamp = pos.timestamp;
      const filterState = filterStateRef.current;
      
      const dt_sec = filterState.lastTimestamp 
        ? (timestamp - filterState.lastTimestamp) / 1000 
        : 1;
      
      // Convert raw speed to km/h
      let rawSpeedKmh = speed && speed > 0 ? parseFloat((speed * 3.6).toFixed(1)) : 0;
      let rawHeading = (heading !== null && heading !== undefined && !Number.isNaN(heading)) ? heading : null;
      
      // If uninitialized, set the initial state directly to skip the filter ramp-up lag
      if (!filterState.initialized) {
        filterState.smoothedSpeed = rawSpeedKmh;
        if (rawHeading !== null) filterState.smoothedHeading = rawHeading;
        filterState.lastTimestamp = timestamp;
        filterState.initialized = true;

        setPosition({
          coordinates: [longitude, latitude],
          speed_kmh: rawSpeedKmh,
          heading_deg: rawHeading !== null ? rawHeading : 0,
          error: null
        });
        return;
      }

      // --- 1. Plausibility Check (Outlier Rejection) ---
      
      // Slew-Rate Limiting for Speed: physical max acceleration ~15 km/h per second
      // Prevents massive erratic GPS jumps (e.g., throwing a speed spike of 200km/h)
      if (dt_sec > 0 && dt_sec < 5) { // Only apply limit if it's an active rapid update tick
        const maxDelta = 15 * dt_sec;
        if (Math.abs(rawSpeedKmh - filterState.smoothedSpeed) > maxDelta) {
          rawSpeedKmh = rawSpeedKmh > filterState.smoothedSpeed 
            ? filterState.smoothedSpeed + maxDelta 
            : filterState.smoothedSpeed - maxDelta;
        }
      }

      // Stationary Heading Freeze: GPS vector heading is purely noise when stopped
      if (rawSpeedKmh < 2.0 || rawHeading === null) {
        rawHeading = filterState.smoothedHeading; // Hold last known good heading
      }

      // --- 2. Smoothing (Exponential Moving Average) ---
      
      // Speed EMA (alpha = 0.3) -> favors stability but tracks changes quickly
      const SPEED_ALPHA = 0.3;
      filterState.smoothedSpeed = SPEED_ALPHA * rawSpeedKmh + (1 - SPEED_ALPHA) * filterState.smoothedSpeed;

      // Circular Heading EMA (alpha = 0.2) -> heavier smoothing for compass jitter
      const HEADING_ALPHA = 0.2;
      let smoothedHeading = filterState.smoothedHeading;
      
      // Calculate shortest angular difference (e.g. 350 -> 10 should go through 0, not backwards)
      let diff = ((rawHeading - smoothedHeading + 540) % 360) - 180;
      smoothedHeading = (smoothedHeading + HEADING_ALPHA * diff + 360) % 360;
      
      filterState.smoothedHeading = smoothedHeading;
      filterState.lastTimestamp = timestamp;

      // Commit cleanly formatted data to React state
      setPosition({
        coordinates: [longitude, latitude],
        speed_kmh: parseFloat(filterState.smoothedSpeed.toFixed(1)),
        heading_deg: Math.round(filterState.smoothedHeading),
        error: null
      });
    };

    const errorHandler = (err) => {
      let message = 'An unknown geolocation error occurred.';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          message = 'Location access denied by user. Please enable GPS permissions.';
          break;
        case err.POSITION_UNAVAILABLE:
          message = 'Location position is currently unavailable.';
          break;
        case err.TIMEOUT:
          message = 'Location request timed out.';
          break;
      }
      setPosition(prev => ({ ...prev, error: message }));
    };

    watcherRef.current = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      options
    );

    return () => {
      if (watcherRef.current !== null) {
        navigator.geolocation.clearWatch(watcherRef.current);
      }
    };
  }, []);

  return position;
};
export default useGeolocation;
