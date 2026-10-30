'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  CreditCard,
  Send,
  Share2,
  Calendar,
  Clock,
  Download,
  RefreshCw,
} from 'lucide-react';
import { AdminCustomerProfile } from '@/lib/admin/service';
import { UserDetailModal } from './UserDetailModal';

interface UsersViewProps {
  users: AdminCustomerProfile[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onSearchChange: (search: string) => void;
  onStatusFilterChange: (status: string) => void;
  onPlanFilterChange: (plan: string) => void;
  onUpdateUserStatus: (userId: string, newStatus: 'active' | 'suspended') => Promise<void>;
  onRefresh?: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  total,
  page,
  limit,
  isLoading,
  onPageChange,
  onSearchChange,
  onStatusFilterChange,
  onPlanFilterChange,
  onUpdateUserStatus,
  onRefresh,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminCustomerProfile | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">User Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Registered customer accounts, subscription tiers, and social publishing activity.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs w-fit"
              title="Refresh customer profiles directly from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Customers</span>
            </button>
          )}

          <a
            href="/api/admin/export?type=users"
            download
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs w-fit"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Customer CSV</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, or user ID..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-hidden focus:border-gray-900 transition-all text-gray-800 placeholder:text-gray-400"
            />
          </div>
        </form>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">Status:</span>
          <select
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Plan Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 font-medium">Plan:</span>
          <select
            onChange={(e) => onPlanFilterChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Starter</option>
            <option value="creator_pro">Creator Pro</option>
            <option value="agency_scale">Agency Scale</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan / Billing</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Accounts</th>
                <th className="py-3 px-4">Posts (Pub / Sched)</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400 animate-pulse">
                    Loading customer records from Supabase...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                    No customer records found matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Customer Name & Email */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-gray-900 to-gray-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                            {u.fullName || 'Customer'}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Plan & Payment */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 capitalize">
                        {u.plan.replace('_', ' ')}
                      </div>
                      <div className="text-[10px] text-gray-400 capitalize">{u.paymentStatus}</div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* Connected Accounts */}
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {u.connectedAccountsCount} channels
                    </td>

                    {/* Posts Count */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-600">{u.postsCount.published}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="font-bold text-blue-600">{u.postsCount.scheduled}</span>
                      <span className="text-gray-400 text-[10px] block">({u.postsCount.total} total)</span>
                    </td>

                    {/* Registered Date */}
                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                      {new Date(u.registeredAt).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-bold text-gray-400 group-hover:text-gray-900 inline-flex items-center transition-colors">
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <strong className="text-gray-900">{users.length}</strong> of{' '}
            <strong className="text-gray-900">{total}</strong> total customers
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Detail Profile Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdateStatus={onUpdateUserStatus}
        />
      )}
    </div>
  );
};
