import { useState, useEffect } from 'react';
import Icon from '../../../components/Icon.jsx';
import { authService } from '../../../services/authService.js';

function formatTime(iso) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString();
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (activeFilter === 'active') params.is_active = 'true';
      else if (activeFilter === 'inactive') params.is_active = 'false';
      const data = await authService.adminListUsers(params);
      setUsers(data);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchUsers(); }, [roleFilter, activeFilter]);

  async function handleToggleActive(user) {
    try {
      await authService.adminUpdateUser(user.id, { is_active: !user.is_active });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch {}
  }

  async function handleRoleChange(user, newRole) {
    try {
      await authService.adminUpdateUser(user.id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch {}
  }

  return (
    <div className="p-gutter max-w-5xl mx-auto">
      <div className="mb-lg">
        <h1 className="text-headline-lg text-primary font-bold">User Management</h1>
        <p className="text-on-surface-variant">View, activate/deactivate, and change user roles.</p>
      </div>

      <div className="flex gap-md mb-lg">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-10 px-md rounded-lg border border-outline-variant bg-surface text-body-md">
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)} className="h-10 px-md rounded-lg border border-outline-variant bg-surface text-body-md">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={fetchUsers} className="px-lg py-sm rounded-lg bg-primary text-on-primary text-label-sm font-bold hover:opacity-90 flex items-center gap-xs">
          <Icon name="refresh" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-xl text-on-surface-variant gap-sm">
          <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-xl text-on-surface-variant">
          <Icon name="people" className="text-3xl mb-sm" />
          <p>No users found.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high">
              <tr>
                <th className="p-md text-label-sm font-bold text-on-surface-variant">Name</th>
                <th className="p-md text-label-sm font-bold text-on-surface-variant">Email</th>
                <th className="p-md text-label-sm font-bold text-on-surface-variant">Role</th>
                <th className="p-md text-label-sm font-bold text-on-surface-variant">Status</th>
                <th className="p-md text-label-sm font-bold text-on-surface-variant">Verified</th>
                <th className="p-md text-label-sm font-bold text-on-surface-variant">Last Login</th>
                <th className="p-md text-label-sm font-bold text-on-surface-variant">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t border-outline-variant hover:bg-surface-container-low">
                  <td className="p-md font-bold">{user.name}</td>
                  <td className="p-md text-on-surface-variant">{user.email}</td>
                  <td className="p-md">
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user, e.target.value)}
                      className="px-sm py-xs rounded border border-outline-variant bg-surface text-label-sm"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-md">
                    <span className={`pill text-label-xs font-bold px-sm py-xs rounded-full ${user.is_active ? 'bg-tertiary-container text-tertiary' : 'bg-error-container text-error'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-md">
                    {user.is_verified ? <Icon name="check_circle" className="text-tertiary" /> : <Icon name="cancel" className="text-error" />}
                  </td>
                  <td className="p-md text-label-sm text-on-surface-variant">{formatTime(user.last_login)}</td>
                  <td className="p-md">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`px-md py-sm rounded-lg text-label-sm font-bold border ${user.is_active ? 'border-error text-error hover:bg-error-container' : 'border-tertiary text-tertiary hover:bg-tertiary-container'}`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
