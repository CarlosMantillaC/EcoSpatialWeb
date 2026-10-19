import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import {
  enrollDevice,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
} from '../../lib/webauthn';
import type { AuthenticatorMethod } from '../../types';

interface MethodOption {
  id: AuthenticatorMethod;
  label: string;
  description: string;
}

const METHODS: MethodOption[] = [
  {
    id: 'device',
    label: 'Este dispositivo',
    description:
      'Huella, rostro o PIN del equipo (Windows Hello, Touch ID, Android).',
  },
  {
    id: 'phone',
    label: 'Teléfono',
    description:
      'Usa la huella o PIN de tu móvil. Puede no estar disponible en Chrome/Linux.',
  },
  {
    id: 'securityKey',
    label: 'Llave de seguridad',
    description: 'Llave FIDO2 por USB o NFC (YubiKey u otra compatible).',
  },
];

export function EnrollPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState<AuthenticatorMethod>('phone');
  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = isWebAuthnSupported();

  useEffect(() => {
    let active = true;
    void isPlatformAuthenticatorAvailable().then((available) => {
      if (!active) return;
      setPlatformAvailable(available);
      setMethod(available ? 'device' : 'phone');
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !name.trim()) {
      setError('Completa el nombre y el correo.');
      return;
    }

    setLoading(true);
    try {
      const auth = await enrollDevice(email.trim(), name.trim(), method);
      setSession(auth);
      navigate('/', { replace: true });
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setError('Registro cancelado o tiempo de espera agotado.');
      } else if (err?.name === 'InvalidStateError') {
        setError('Este dispositivo ya tiene una credencial registrada.');
      } else if (err?.name === 'NotSupportedError') {
        setError(
          'El autenticador elegido no esta disponible en este navegador o sistema.',
        );
      } else if (err?.response?.data?.message) {
        setError(
          Array.isArray(err.response.data.message)
            ? err.response.data.message.join(', ')
            : err.response.data.message,
        );
      } else {
        setError('No se pudo registrar el dispositivo. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Registrar dispositivo
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vincula un autenticador a tu perfil. No se guardan contrasenas.
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
            Tu navegador/sistema no expone un autenticador local de huella o PIN
            (habitual en Chrome sobre Linux). Usa un telefono, una llave de
            seguridad o el acceso de demostracion desde el login.
          </p>
        )}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
            Nombre completo
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Operador Demo"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
            Correo corporativo
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="operador@ecospatial.com"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>

        <fieldset className="mb-4">
          <legend className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Metodo de autenticacion
          </legend>
          <div className="space-y-2">
            {METHODS.map((option) => {
              const disabled =
                option.id === 'device' && platformAvailable !== true;
              const selected = method === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={option.id}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => setMethod(option.id)}
                    className="mt-1 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {option.label}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !supported}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Registrar autenticador'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link
            to="/login"
            className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Volver al inicio de sesion
          </Link>
        </p>
      </form>
    </div>
  );
}
