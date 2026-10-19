import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { ThemeToggle } from './ThemeToggle';

export function AppHeader() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="pointer-events-auto flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
          &#9673;
        </span>
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
            EcoSpatial Web
          </p>
          <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
            Despacho inteligente de flota
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">
            {user?.name}
          </p>
          <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
            {user?.email}
          </p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
