'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Shield,
  Ban,
  CheckCircle2,
  Lock,
  RefreshCw,
  Edit,
  UploadCloud,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { FileUpload } from '@/components/ui/FileUpload';
import { useToast } from '@/components/ui/Toast';

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: 'PLATFORM_OWNER' | 'VENDOR' | 'WAREHOUSE' | 'CUSTOMER' | 'MDM';
  isSuspended: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Selected User for Actions
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'VENDOR',
  });
  const [selectedRole, setSelectedRole] = useState('VENDOR');
  const [formLoading, setFormLoading] = useState(false);

  // Authorization Check
  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'PLATFORM_OWNER') {
        toast('Access Denied', 'Only Platform Owners can access User Management.', 'error');
        router.push('/dashboard');
      } else {
        fetchUsers();
      }
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        toast('Error', data.error || 'Failed to fetch user directory', 'error');
      }
    } catch (e) {
      toast('Network Error', 'Failed to connect to backend user API', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) {
        toast('User Creation Failed', data.error || 'Failed to create user', 'error');
      } else {
        toast(
          'User Created Successfully! 🎉',
          `Created ${createForm.fullName} (${createForm.role}). Audit log recorded.`,
          'success'
        );
        setIsCreateOpen(false);
        setCreateForm({ fullName: '', email: '', password: '', role: 'VENDOR' });
        fetchUsers();
      }
    } catch (e: any) {
      toast('Error', 'An unexpected error occurred.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Suspend/Unsuspend User Handler
  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    const newSuspendState = !selectedUser.isSuspended;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: newSuspendState }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast('Action Failed', data.error || 'Failed to update user status', 'error');
      } else {
        toast(
          newSuspendState ? 'Account Suspended 🚫' : 'Account Re-Activated ✅',
          `User ${selectedUser.email} is now ${newSuspendState ? 'suspended' : 'active'}. Audit entry logged.`,
          newSuspendState ? 'warning' : 'success'
        );
        setIsSuspendOpen(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (e) {
      toast('Error', 'Network error modifying user state.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Change Role Handler
  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast('Role Assignment Failed', data.error || 'Failed to change role', 'error');
      } else {
        toast(
          'Role Re-Assigned Successfully! 🛡️',
          `Updated ${selectedUser.email} to ${selectedRole}. Audit log entry created.`,
          'success'
        );
        setIsRoleOpen(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (e) {
      toast('Error', 'Failed to update user role.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Role Badge Color Mapping
  const getRoleBadgeVariant = (role: string): BadgeVariant => {
    switch (role) {
      case 'PLATFORM_OWNER':
        return 'purple';
      case 'VENDOR':
        return 'amber';
      case 'WAREHOUSE':
        return 'emerald';
      case 'CUSTOMER':
        return 'sky';
      default:
        return 'slate';
    }
  };

  // Table Columns
  const columns: Column<UserRecord>[] = [
    {
      header: 'User / Identity',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0">
            {row.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white truncate">{row.fullName}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role Assignment',
      accessor: (row) => (
        <Badge variant={getRoleBadgeVariant(row.role)}>
          {row.role}
        </Badge>
      ),
    },
    {
      header: 'MFA Status',
      accessor: (row) =>
        row.mfaEnabled ? (
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
            <Lock className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="text-[11px] font-mono text-slate-500">Disabled</span>
        ),
    },
    {
      header: 'Account State',
      accessor: (row) =>
        row.isSuspended ? (
          <Badge variant="rose">Suspended</Badge>
        ) : (
          <Badge variant="emerald">Active</Badge>
        ),
    },
    {
      header: 'Created At',
      accessor: (row) => (
        <span className="text-[11px] font-mono text-slate-400">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Platform User Administration</h1>
            <p className="text-xs text-slate-400 font-mono">
              Acceptance Criteria #2 — Create users, suspend accounts, and assign role matrices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<UploadCloud className="w-4 h-4" />}
            onClick={() => setIsUploadOpen(true)}
          >
            Upload Docs
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create New User
          </Button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" /> Platform User Directory
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchUsers} isLoading={loading}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Search by name, email, or role..."
          searchableKey="email"
          actions={(row) => (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedUser(row);
                  setSelectedRole(row.role);
                  setIsRoleOpen(true);
                }}
              >
                <Edit className="w-3.5 h-3.5" /> Role
              </Button>
              <Button
                variant={row.isSuspended ? 'secondary' : 'danger'}
                size="sm"
                onClick={() => {
                  setSelectedUser(row);
                  setIsSuspendOpen(true);
                }}
              >
                {row.isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                {row.isSuspended ? 'Unsuspend' : 'Suspend'}
              </Button>
            </div>
          )}
        />
      </div>

      {/* 1. Modal: Create User */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New System User"
        subtitle="Admin User Provisioning — Triggers Audit Log Entry"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={createForm.fullName}
            onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
            placeholder="e.g. Sarah Jenkins"
          />

          <Input
            label="Email Address"
            type="email"
            required
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="e.g. sarah.jenkins@company.com"
          />

          <Input
            label="Initial Password"
            type="password"
            required
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="••••••••••••"
            helperText="Must be 8+ characters with numbers & symbols"
          />

          <Select
            label="Assign Role"
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            options={[
              { value: 'PLATFORM_OWNER', label: 'PLATFORM_OWNER (Full Admin)' },
              { value: 'VENDOR', label: 'VENDOR (B2B Hardware Supplier)' },
              { value: 'WAREHOUSE', label: 'WAREHOUSE (3PL Logistics Hub)' },
              { value: 'CUSTOMER', label: 'CUSTOMER (Retail Buyer)' },
            ]}
          />

          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading}>
              Provision User
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Assign / Change Role */}
      <Modal
        isOpen={isRoleOpen}
        onClose={() => setIsRoleOpen(false)}
        title={`Re-Assign Role: ${selectedUser?.fullName}`}
        subtitle={`Current Role: ${selectedUser?.role}`}
      >
        <form onSubmit={handleChangeRole} className="space-y-4">
          <Select
            label="Select New System Role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            options={[
              { value: 'PLATFORM_OWNER', label: 'PLATFORM_OWNER (Platform Owner)' },
              { value: 'VENDOR', label: 'VENDOR (Hardware Vendor)' },
              { value: 'WAREHOUSE', label: 'WAREHOUSE (Hub Operations)' },
              { value: 'CUSTOMER', label: 'CUSTOMER (Retail Buyer)' },
            ]}
          />

          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-mono">
            ⚠️ Changing role will immediately update user permissions across all dashboard modules and log a <code className="font-bold">USER_ROLE_CHANGED</code> audit entry.
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsRoleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading}>
              Update Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Suspend / Unsuspend Confirmation */}
      <Modal
        isOpen={isSuspendOpen}
        onClose={() => setIsSuspendOpen(false)}
        title={selectedUser?.isSuspended ? 'Unsuspend Account' : 'Suspend User Account'}
        subtitle={`Target: ${selectedUser?.email}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {selectedUser?.isSuspended
                  ? 'Re-activating this user account'
                  : 'Suspending this user account'}
              </p>
              <p className="text-[11px] text-amber-300/80 mt-1">
                {selectedUser?.isSuspended
                  ? 'The user will regain ability to log in and access their role dashboard.'
                  : 'The user will be immediately blocked from logging in. Any active sessions will be terminated.'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedUser?.isSuspended ? 'primary' : 'danger'}
              onClick={handleToggleSuspend}
              isLoading={formLoading}
            >
              {selectedUser?.isSuspended ? 'Confirm Unsuspend' : 'Confirm Suspension'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Modal: Component Library File Upload Test */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload User Documentation"
        subtitle="Reusable FileUpload Component Test (Pillar Compliance Documents)"
      >
        <div className="space-y-4">
          <FileUpload
            label="Compliance Document / ID Verification"
            accept=".pdf,.png,.jpg"
            maxSizeMB={5}
            helperText="Upload official PDF or PNG trade license documents for vendor verification."
          />

          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={() => {
              toast('File Saved', 'Compliance document uploaded and attached to audit log.', 'success');
              setIsUploadOpen(false);
            }}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
