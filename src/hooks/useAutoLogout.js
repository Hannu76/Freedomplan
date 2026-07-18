import { useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';

const TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes

export function useAutoLogout(onExpire) {
  const { isLoggedIn, setIsLoggedIn, setCurrentUser } = useStore();
  const timerRef = useRef(null);

  const handleLogout = () => {
    if (isLoggedIn) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      console.log('Session expired due to inactivity. Data has been auto-saved to localStorage.');
      if (onExpire) onExpire();
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isLoggedIn) {
      timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Initialize timer
    resetTimer();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isLoggedIn]);

}
