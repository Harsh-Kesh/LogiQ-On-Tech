'use client';

import { useState, useEffect } from 'react';
import { UserRole } from '@prisma/client';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { FileUpload } from '@/components/ui/FileUpload';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Users, UserPlus, UserX, UserCheck, RefreshCw, Upload } from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isSuspended: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Form State
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('VENDOR');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        const userList = Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []);
        setUsers(userList);
      } else {
        setUsers([]);
        setToast({ message: 'Failed to load users from database.', type: 'error' });
      }
    } catch {
      setUsers([]);
      setToast({ message: 'Error connecting to admin user API.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.includes('@') || !newFullName.trim()) {
      setToast({ message: 'Please enter a valid full name and email address.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, fullName: newFullName, role: newRole, password: newPassword }),
      });

      if (res.ok) {
        setToast({ message: `User ${newEmail} created successfully!`, type: 'success' });
        setIsCreateOpen(false);
        setNewEmail('');
        setNewFullName('');
        setNewPassword('');
        fetchUsers();
      } else {
        const err = await res.json();
        setToast({ message: err.error || 'Failed to create user.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error creating user.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole() {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setToast({ message: `Updated ${selectedUser.fullName}'s role to ${newRole}`, type: 'success' });
        setIsRoleModalOpen(false);
        fetchUsers();
      } else {
        setToast({ message: 'Failed to update user role.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error updating role.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleSuspend() {
    if (!selectedUser) return;
    setSubmitting(true);
    const nextState = !selectedUser.isSuspended;
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: nextState }),
      });

      if (res.ok) {
        setToast({
          message: `${selectedUser.fullName} has been ${nextState ? 'SUSPENDED (Login Blocked)' : 'REACTIVATED'}`,
          type: nextState ? 'error' : 'success',
        });
        setIsSuspendModalOpen(false);
        fetchUsers();
      } else {
        setToast({ message: 'Failed to toggle suspension state.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error toggling suspension.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<ManagedUser>[] = [
    {
      header: 'Full Name & Email',
      accessorKey: 'fullName',
      cell: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row.fullName}</div>
          <div className="text-xs font-mono text-slate-500">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Role Assignment',
      accessorKey: 'role',
      cell: (row) => {
        let variant: 'indigo' | 'amber' | 'emerald' | 'sky' | 'slate' = 'indigo';
        if (row.role === 'VENDOR') variant = 'amber';
        if (row.role === 'WAREHOUSE') variant = 'emerald';
        if (row.role === 'MDM') variant = 'sky';
        return <Badge variant={variant}>{row.role}</Badge>;
      },
    },
    {
      header: 'Account Status',
      accessorKey: 'isSuspended',
      cell: (row) => (
        <Badge variant={row.isSuspended ? 'danger' : 'success'}>
          {row.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
        </Badge>
      ),
    },
    {
      header: '2FA Security',
      accessorKey: 'mfaEnabled',
      cell: (row) => (
        <span className="text-xs font-mono font-semibold text-slate-600">
          {row.mfaEnabled ? '🔒 TOTP Enabled' : '🔓 Pending'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedUser(row);
              setNewRole(row.role);
              setIsRoleModalOpen(true);
            }}
          >
            Role
          </Button>

          <Button
            size="sm"
            variant={row.isSuspended ? 'success' : 'danger'}
            onClick={() => {
              setSelectedUser(row);
              setIsSuspendModalOpen(true);
            }}
          >
            {row.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
          </Button>
        </div>
      ),
    },
  ];

  const userArray = Array.isArray(users) ? users : [];
  const filteredUsers = userArray.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner matching Platform Owner */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">User Directory &amp; RBAC Control</h1>
            <p className="text-xs text-slate-500 font-mono">Provision Accounts, Modify Roles &amp; Suspend Access</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Provision New User
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-48">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'PLATFORM_OWNER', label: 'Platform Owner' },
                { value: 'VENDOR', label: 'Vendor' },
                { value: 'WAREHOUSE', label: 'Warehouse Manager' },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={fetchUsers} isLoading={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={loading}
          emptyMessage="No matching users found in the system."
        />
      </div>

      {/* Bulk Upload Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Upload className="w-4 h-4 text-indigo-600" />
          Bulk CSV Import User Provisioning
        </div>
        <FileUpload
          accept=".csv,.xlsx"
          onFileSelect={(file) => {
            if (file) {
              setToast({ message: `Uploaded ${file.name} (Ready for background processing)`, type: 'info' });
            }
          }}
        />
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Provision New Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="Full Name" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="e.g. Sarah Connor" />
          <Input label="Email Address" type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="e.g. sarah@logiqon.com" />
          <Select
            label="Initial Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            options={[
              { value: 'PLATFORM_OWNER', label: 'Platform Owner' },
              { value: 'VENDOR', label: 'Vendor' },
              { value: 'WAREHOUSE', label: 'Warehouse Manager' },
            ]}
          />
          <Input label="Initial Password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={submitting}>Create User Account</Button>
          </div>
        </form>
      </Modal>

      {/* Change Role Modal */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Update Role Assignment">
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Modifying role for <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedUser?.fullName}</span>.
          </p>
          <Select
            label="Select New Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            options={[
              { value: 'PLATFORM_OWNER', label: 'Platform Owner' },
              { value: 'VENDOR', label: 'Vendor' },
              { value: 'WAREHOUSE', label: 'Warehouse Manager' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateRole} isLoading={submitting}>Save Role</Button>
          </div>
        </div>
      </Modal>

      {/* Toggle Suspend Modal */}
      <Modal isOpen={isSuspendModalOpen} onClose={() => setIsSuspendModalOpen(false)} title="Account Access Control">
        <div className="space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Are you sure you want to {selectedUser?.isSuspended ? 'reactivate' : 'suspend'} access for{' '}
            <span className="font-extrabold text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedUser?.fullName}</span> ({selectedUser?.email})?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsSuspendModalOpen(false)}>Cancel</Button>
            <Button
              variant={selectedUser?.isSuspended ? 'success' : 'danger'}
              onClick={handleToggleSuspend}
              isLoading={submitting}
            >
              Confirm {selectedUser?.isSuspended ? 'Reactivation' : 'Suspension'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
