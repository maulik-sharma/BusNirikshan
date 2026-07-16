import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) => {
  const [position, setPosition] = useState({
    coordinates: null, // [lng, lat]
    speed_kmh: 0,
    heading_deg: 0,
    error: null
  });
  
  const watcherRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition(prev => ({ ...prev, error: 'Geolocation is not supported by this browser.' }));
      return;
    }

    const successHandler = (pos) => {
      const { latitude, longitude, speed, heading } = pos.coords;
      
      // Convert speed from meters/second to kilometers/hour
      const speedKmh = speed && speed > 0 ? parseFloat((speed * 3.6).toFixed(1)) : 0;
      
      setPosition(prev => {
        const newHeading = (heading !== null && heading !== undefined && !Number.isNaN(heading)) 
          ? heading 
          : prev.heading_deg;

        return {
          coordinates: [longitude, latitude],
          speed_kmh: speedKmh,
          heading_deg: newHeading,
          error: null
        };
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
