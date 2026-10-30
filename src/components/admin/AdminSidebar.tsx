'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Share2,
  Send,
  CreditCard,
  Smartphone,
  History,
  Activity,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ExternalLink,
  Crown,
} from 'lucide-react';
import { PostingTubeLogo } from '@/components/PostingTubeLogo';

export type AdminTab =
  | 'overview'
  | 'users'
  | 'accounts'
  | 'posts'
  | 'billing'
  | 'devices'
  | 'activity'
  | 'system'
  | 'security';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  ownerEmail: string;
  onLogout: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  ownerEmail,
  onLogout,
  collapsed = false,
}) => {
  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'accounts', label: 'Connected Accounts', icon: Share2 },
    { id: 'posts', label: 'Posts & Publishing', icon: Send },
    { id: 'billing', label: 'Subscriptions & Billing', icon: CreditCard },
    { id: 'devices', label: 'Analytics & Devices', icon: Smartphone },
    { id: 'activity', label: 'Activity Logs', icon: History },
    { id: 'system', label: 'System Health', icon: Activity },
    { id: 'security', label: 'Security & Settings', icon: ShieldCheck },
  ];

  return (
    <aside
      className={`h-screen bg-white border-r border-gray-200/90 flex flex-col justify-between shrink-0 select-none transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-gray-100">
        <Link
          href="/dashboard"
          onClick={() => {
            try {
              localStorage.setItem('postingtube_active_tab', 'new-post');
              sessionStorage.setItem('postingtube_active_tab', 'new-post');
            } catch (e) {}
          }}
          className="flex items-center space-x-2.5 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none group"
          title="Return to PostingTube Creator Dashboard"
        >
          <PostingTubeLogo />
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center space-x-1">
                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span className="text-xs font-black text-gray-900 tracking-tight">Super Admin</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                Owner Control
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Management
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gray-900 text-white shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0 text-left">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}

        {!collapsed && (
          <div className="pt-4 px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Quick Links
          </div>
        )}

        <Link
          href="/dashboard"
          target="_blank"
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          title="Open SaaS User Dashboard in new tab"
        >
          <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
          {!collapsed && <span>Open User SaaS</span>}
        </Link>
      </div>

      {/* Bottom Owner Profile & Logout */}
      <div className="p-3 border-t border-gray-100 space-y-2 bg-gray-50/50">
        <div className="flex items-center space-x-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-amber-500 to-rose-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
            {ownerEmail.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-900 truncate">Platform Owner</div>
              <div className="text-[10px] text-gray-500 truncate" title={ownerEmail}>
                {ownerEmail}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-gray-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          {!collapsed && <span>Sign Out Admin</span>}
        </button>
      </div>
    </aside>
  );
};
