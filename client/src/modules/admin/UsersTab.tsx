import { FormEvent, useEffect, useState } from 'react';
import { usersApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import type { AdminUser, UserRole } from '../../types';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  operator: 'Operadora',
};

/**
 * Gestion de usuarios y roles (solo administrador). Un usuario creado
 * aqui inscribe su dispositivo biometrico despues desde la pantalla de
 * registro con su mismo correo (el perfil ya existe y se conserva el rol).
 */
export function UsersTab() {
  const me = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'operator' as UserRole,
  });

  async function load() {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } catch {
      setError('No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await usersApi.create(form);
      setForm({ name: '', email: '', role: 'operator' });
      setShowForm(false);
      setNotice(
        'Usuario creado. Debe registrar su dispositivo con este correo en la pantalla de registro.',
      );
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo crear el usuario.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(user: AdminUser, role: UserRole) {
    setError(null);
    setNotice(null);
    try {
      await usersApi.updateRole(user.id, role);
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : (message ?? 'No se pudo cambiar el rol.'),
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {users.length} usuario(s)
        </p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {showForm ? 'Cerrar' : 'Nuevo usuario'}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <input
            className={INPUT}
            placeholder="Nombre *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={INPUT}
            type="email"
            placeholder="Correo *"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <select
            className={INPUT}
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as UserRole })
            }
          >
            <option value="operator">Rol: Operadora</option>
            <option value="admin">Rol: Administrador</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear usuario'}
          </button>
        </form>
      )}

      <div className="space-y-1.5">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {user.name}
                  {user.id === me?.id && (
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      tu
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                value={user.role}
                onChange={(e) =>
                  void changeRole(user, e.target.value as UserRole)
                }
              >
                <option value="operator">{ROLE_LABEL.operator}</option>
                <option value="admin">{ROLE_LABEL.admin}</option>
              </select>
            </div>
          </div>
        ))}
        {loading && users.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cargando...
          </p>
        )}
      </div>
    </div>
  );
}
