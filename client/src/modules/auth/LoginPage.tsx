import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { authApi } from '../../lib/api';
import {
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  loginWithBiometrics,
} from '../../lib/webauthn';

export function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(
    null,
  );
  const [devLoginEnabled, setDevLoginEnabled] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  const supported = isWebAuthnSupported();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    void isPlatformAuthenticatorAvailable().then(setPlatformAvailable);
    void authApi
      .config()
      .then((config) => setDevLoginEnabled(config.devLoginEnabled))
      .catch(() => setDevLoginEnabled(false));
  }, []);

  function extractError(err: any, fallback: string): string {
    if (err?.name === 'NotAllowedError') {
      return 'Operacion cancelada o tiempo de espera agotado.';
    }
    if (err?.name === 'InvalidStateError') {
      return 'La credencial ya no es valida en este dispositivo.';
    }
    if (err?.name === 'NotSupportedError') {
      return 'Este dispositivo no puede usar el autenticador solicitado.';
    }
    if (err?.response?.data?.message) {
      return Array.isArray(err.response.data.message)
        ? err.response.data.message.join(', ')
        : err.response.data.message;
    }
    return fallback;
  }

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const auth = await loginWithBiometrics(
        showEmail && email.trim() ? email.trim() : undefined,
      );
      setSession(auth);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(
        extractError(err, 'No se pudo validar la biometria. Intenta de nuevo.'),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!devEmail.trim()) {
      setError('Ingresa un correo para el acceso de demostracion.');
      return;
    }
    setDevLoading(true);
    try {
      const auth = await authApi.devLogin(devEmail.trim());
      setSession(auth);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(extractError(err, 'No se pudo iniciar el acceso de demostracion.'));
    } finally {
      setDevLoading(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-2xl text-white">
            &#9673;
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            EcoSpatial Web
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Plataforma logistica con acceso sin contrasena
          </p>
        </div>

        {!supported && (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Este navegador no soporta WebAuthn. Usa Chrome, Edge o Safari
            actualizado.
          </p>
        )}

        {supported && platformAvailable === false && (
          <p className="mb-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
            Este equipo no ofrece huella/PIN local como autenticador WebAuthn.
            Usa un telefono, una llave de seguridad
            {devLoginEnabled ? ' o el acceso de demostracion.' : '.'}
          </p>
        )}

        {supported && platformAvailable === true && (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            Autenticador local disponible: se pedira huella, rostro o PIN del
            equipo.
          </p>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading || !supported}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33"
            />
          </svg>
          {loading ? 'Validando...' : 'Ingresar con biometrica'}
        </button>

        <button
          type="button"
          onClick={() => setShowEmail((value) => !value)}
          className="mt-3 w-full text-center text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
        >
          {showEmail ? 'Ocultar opciones' : 'Usar un correo especifico'}
        </button>

        {showEmail && (
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="operador@ecospatial.com"
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {devLoginEnabled && (
          <form
            onSubmit={handleDevLogin}
            className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4 dark:border-amber-700 dark:bg-amber-950/20"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Acceso de demostracion (solo desarrollo)
            </p>
            <p className="mb-3 text-xs text-amber-800/80 dark:text-amber-300/80">
              Entra con un correo sin biometria para probar el MVP en equipos sin
              autenticador.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={devEmail}
                onChange={(event) => setDevEmail(event.target.value)}
                placeholder="demo@ecospatial.com"
                className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-amber-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={devLoading}
                className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {devLoading ? 'Entrando...' : 'Entrar demo'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          ¿Primer ingreso?{' '}
          <Link
            to="/enroll"
            className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Registrar dispositivo
          </Link>
        </p>
      </div>
    </div>
  );
}
