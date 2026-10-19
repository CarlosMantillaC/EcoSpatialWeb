import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

export function useInactivityLogout(timeoutMs = 5 * 60 * 1000) {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (status !== 'authenticated') return;

    let timer: number;

    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, timeoutMs);
    };

    reset();
    EVENTS.forEach((event) =>
      window.addEventListener(event, reset, { passive: true }),
    );

    return () => {
      window.clearTimeout(timer);
      EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [status, logout, navigate, timeoutMs]);
}
