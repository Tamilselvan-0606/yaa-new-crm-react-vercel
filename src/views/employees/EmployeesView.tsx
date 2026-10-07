import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { User, Product, Role } from '../../types';
import {
  UsersRound,
  Plus,
  Search,
  Filter,
  Mail,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Edit,
  Trash2,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Badge, getStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const EmployeesView: React.FC = () => {
  const { isAdmin, showToast } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formRole, setFormRole] = useState<Role>('Staff');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | undefined>('Active');
  const [formAvatar, setFormAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffList, prodList] = await Promise.all([
        api.getEmployees(),
        api.getProducts(),
      ]);
      setEmployees(staffList);
      setProducts(prodList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('error', 'Unauthorized', 'Only Admins can add or modify company staff.');
      return;
    }
    try {
      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, {
          name: formName,
          email: formEmail,
          title: formTitle,
          role: formRole,
          status: formStatus,
          avatar: formAvatar,
        });
        showToast('success', 'Employee Updated', 'Staff record updated successfully.');
      } else {
        await api.createEmployee({
          name: formName,
          email: formEmail,
          title: formTitle,
          role: formRole,
          status: formStatus,
          avatar: formAvatar,
          assignedProducts: ['prod_1'],
        });
        showToast('success', 'Staff Member Added', `${formName} added to roster.`);
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
      loadData();
    } catch (e: any) {
      showToast('error', 'Operation Failed', e.message);
    }
  };

  const openEdit = (emp: User) => {
    setEditingEmployee(emp);
    setFormName(emp.name);
    setFormEmail(emp.email);
    setFormTitle(emp.title);
    setFormRole(emp.role);
    setFormStatus(emp.status);
    setFormAvatar(emp.avatar);
    setIsModalOpen(true);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      searchQuery === '' ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'ALL' || emp.role === filterRole;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#33077C]">
            Internal Staff & Employee Directory
          </h2>
          <p className="text-xs text-slate-500">
            RBAC role administration, team assignments, and workload performance tracking.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingEmployee(null);
              setFormName('');
              setFormEmail('');
              setFormTitle('Product Specialist');
              setFormRole('Staff');
              setFormStatus('Active');
              setIsModalOpen(true);
            }}
            className="h-11 px-6 bg-[#4309A2] hover:bg-[#e67e00] text-white text-sm font-bold rounded-xl shadow-md shadow-[#4309A2]/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, email, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4309A2] outline-none"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none font-medium text-slate-700"
        >
          <option value="ALL">All Roles</option>
          <option value="Admin">Administrators</option>
          <option value="Staff">Staff Members</option>
        </select>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-purple-100"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[#33077C]">{emp.name}</h4>
                    <p className="text-xs text-slate-500">{emp.title}</p>
                  </div>
                </div>
                <Badge variant={emp.role === 'Admin' ? 'accent' : 'purple'} size="sm">
                  {emp.role}
                </Badge>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{emp.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Status: <strong className="text-emerald-700">{emp.status}</strong></span>
                </div>
              </div>

              {/* Performance Metrics Tracker */}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Leads</span>
                  <span className="text-xs font-black text-[#33077C]">{emp.performanceMetrics?.leadsHandled || 12}</span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Tasks Done</span>
                  <span className="text-xs font-black text-emerald-700">{emp.performanceMetrics?.tasksCompleted || 24}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Content</span>
                  <span className="text-xs font-black text-amber-600">{emp.performanceMetrics?.contentCreated || 8}</span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEdit(emp)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? `Edit ${editingEmployee.name}` : 'Add Staff Member'}
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Position / Job Title</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role Type</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              >
                <option value="Staff">Staff (Restricted Access)</option>
                <option value="Admin">Admin (Full System Access)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Avatar Image URL</label>
            <input
              type="text"
              value={formAvatar}
              onChange={(e) => setFormAvatar(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono text-[11px]"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 px-6 bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Save Staff Member</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
