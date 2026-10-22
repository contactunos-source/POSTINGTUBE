'use client';

import React, { useState, useEffect } from 'react';
import { SocialAccount, SocialPlatform } from '@/types/social';
import { PlatformLogo } from './SocialIcons';
import {
  X,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Plus,
  Flag,
  Users,
  ChevronDown,
  ArrowLeft,
  Check,
  AlertCircle,
  HelpCircle,
  Key,
} from 'lucide-react';
import { PLATFORM_CONFIGS } from '@/lib/constants';

interface ConnectedAccountsProps {
  accounts: SocialAccount[];
  currentWorkspaceId?: string;
  onAddAccount: (account: SocialAccount) => void;
  onRemoveAccount: (id: string) => void;
  onRefreshAccount: (id: string) => void;
  onNavigateToTab?: (tab: any) => void;
  onShowSuccessToast?: (message: string) => void;
}

interface DetectedPage {
  id: string;
  name: string;
  avatarUrl: string;
  accessToken: string;
  platform?: 'facebook' | 'instagram';
}

export const ConnectedAccounts: React.FC<ConnectedAccountsProps> = ({
  accounts,
  currentWorkspaceId,
  onAddAccount,
  onRemoveAccount,
  onRefreshAccount,
  onNavigateToTab,
  onShowSuccessToast,
}) => {
  // Modal state
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);

  // Facebook Connection Flow Steps:
  // 1: 'select_type' (Page vs Group - Image 2)
  // 2: 'auth' (OAuth or API Token - Image 3)
  // 3: 'confirm' (Confirm your Account / Pages list - Image 4)
  const [fbStep, setFbStep] = useState<'select_type' | 'auth' | 'confirm'>('select_type');
  const [accountTypeChoice, setAccountTypeChoice] = useState<'page' | 'group'>('page');

  // Facebook Token and Form state
  const [fbPageId, setFbPageId] = useState('122149488525072386'); // Pre-filled with user's ID from screenshot
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Discovered Facebook Pages from Meta
  const [discoveredPages, setDiscoveredPages] = useState<DetectedPage[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  // Other platform states
  const [genericHandle, setGenericHandle] = useState('');
  const [genericToken, setGenericToken] = useState('');

  // UI Feedback
  const [refreshingPlatform, setRefreshingPlatform] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const platforms: SocialPlatform[] = [
    'facebook',
    'instagram',
    'twitter',
    'linkedin',
    'youtube',
    'tiktok',
    'threads',
    'bluesky',
    'pinterest',
  ];

  // Auto-check for server environment token and OAuth redirect callback
  useEffect(() => {
    fetch('/api/facebook/saved-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.envPageId && !fbPageId) {
          setFbPageId(data.envPageId);
        }
      })
      .catch(() => {});

    // Check if returning from Facebook OAuth
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isFbSuccess = urlParams.get('fb_connect_success');
      const discoveredJson = urlParams.get('discovered_pages');
      const authError = urlParams.get('error');

      const authNotice = urlParams.get('notice');

      if (authError) {
        setVerifyError(decodeURIComponent(authError));
        setConnectingPlatform('facebook');
        setFbStep('select_type');
      } else if (authNotice) {
        setToastMessage(decodeURIComponent(authNotice));
        setTimeout(() => setToastMessage(null), 4500);
      } else if (isFbSuccess && discoveredJson) {
        try {
          const parsedPages: DetectedPage[] = JSON.parse(discoveredJson);
          if (parsedPages.length > 0) {
            setDiscoveredPages(parsedPages);
            setSelectedPageIds(parsedPages.map((p) => p.id));
            setConnectingPlatform('facebook');
            setFbStep('confirm'); // Move straight to Confirm your Account!
          }
        } catch (e) {
          console.error('Failed to parse discovered pages', e);
        }
      }

      if (authError || authNotice || (isFbSuccess && discoveredJson)) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleStartConnect = (platform: SocialPlatform) => {
    setConnectingPlatform(platform);
    setVerifyError(null);
    setFbStep('select_type');
    setAccountTypeChoice('page');
    setDiscoveredPages([]);
    setSelectedPageIds([]);
    setGenericHandle('');
    setGenericToken('');
  };

  // Step 2 -> Step 3: Verify with Meta Graph API and discover pages
  const handleVerifyFacebookPages = async () => {
    if (!fbAccessToken.trim()) {
      setVerifyError('Please enter your Facebook Access Token.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch('/api/facebook/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: fbAccessToken.trim(),
          pageId: fbPageId.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setVerifyError(data.error || 'Failed to authenticate with Facebook Graph API.');
        setIsVerifying(false);
        return;
      }

      const pages: DetectedPage[] = data.pages || (data.page ? [data.page] : []);
      if (pages.length === 0) {
        setVerifyError('No Facebook Pages found associated with this token.');
        setIsVerifying(false);
        return;
      }

      setDiscoveredPages(pages);
      setSelectedPageIds(pages.map((p) => p.id)); // Select all detected pages by default
      setFbStep('confirm'); // Move to "Confirm your Account" (Image 4)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error verifying Facebook token';
      setVerifyError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 3 -> Finish: Save selected accounts and trigger Success popup
  const handleFinishConnection = () => {
    const selected = discoveredPages.filter((p) => selectedPageIds.includes(p.id));
    if (selected.length === 0) {
      setVerifyError('Please select at least one Account or Page to connect.');
      return;
    }

    selected.forEach((page) => {
      const isInstagram = page.platform === 'instagram';
      const newAcc: SocialAccount = {
        id: `${isInstagram ? 'ig' : 'fb'}_${page.id}`,
        platform: isInstagram ? 'instagram' : 'facebook',
        username: page.name.toLowerCase().replace(/\s+/g, ''),
        displayName: page.name,
        avatarUrl:
          page.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        accountType: isInstagram ? 'profile' : 'page',
        status: 'connected',
        followersCount: 0,
        externalId: page.id,
        accessToken: page.accessToken || fbAccessToken.trim(),
        pageId: page.id,
      };
      onAddAccount(newAcc);
    });

    setConnectingPlatform(null);
    setDiscoveredPages([]);
    setSelectedPageIds([]);

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/dashboard');
    }

    let dynamicMessage = 'Your account has been successfully connected!';
    const hasFb = selected.some((p) => p.platform !== 'instagram');
    const hasIg = selected.some((p) => p.platform === 'instagram');
    if (hasFb && hasIg) {
      dynamicMessage = 'Your Facebook and Instagram accounts have been successfully connected!';
    } else if (hasIg) {
      dynamicMessage = 'Your Instagram account has been successfully connected!';
    } else if (hasFb) {
      dynamicMessage = 'Your Facebook account has been successfully connected!';
    }

    setToastMessage(dynamicMessage);
    setTimeout(() => setToastMessage(null), 5000);

    if (onShowSuccessToast) {
      onShowSuccessToast(dynamicMessage);
    }

    if (onNavigateToTab) {
      onNavigateToTab('new-post');
    }
  };

  const handleConnectOtherPlatform = () => {
    if (!connectingPlatform) return;
    if (!genericHandle.trim()) {
      setVerifyError('Please enter account handle or username.');
      return;
    }

    const newAcc: SocialAccount = {
      id: `${connectingPlatform}_${Date.now()}`,
      platform: connectingPlatform,
      username: genericHandle.replace(/^@/, '').trim(),
      displayName: genericHandle.replace(/^@/, '').trim(),
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      status: 'connected',
      accessToken: genericToken.trim() || undefined,
      followersCount: 0,
    };

    const platformName = PLATFORM_CONFIGS[connectingPlatform]?.name || connectingPlatform;
    onAddAccount(newAcc);
    setConnectingPlatform(null);
    setGenericHandle('');
    setGenericToken('');

    const dynamicMessage = `Your ${platformName} account has been successfully connected!`;
    setToastMessage(dynamicMessage);
    setTimeout(() => setToastMessage(null), 5000);

    if (onShowSuccessToast) {
      onShowSuccessToast(dynamicMessage);
    }

    if (onNavigateToTab) {
      onNavigateToTab('new-post');
    }
  };

  const handleBatchRefresh = (platform: SocialPlatform) => {
    setRefreshingPlatform(platform);
    setTimeout(() => {
      accounts
        .filter((a) => a.platform === platform)
        .forEach((a) => onRefreshAccount(a.id));
      setRefreshingPlatform(null);
      setToastMessage(`Refreshed access tokens for ${PLATFORM_CONFIGS[platform].name}.`);
      setTimeout(() => setToastMessage(null), 3000);
    }, 700);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      {/* Toast Success Popup */}
      {toastMessage && (
        <div className="fixed top-8 right-8 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs z-50 animate-in fade-in slide-in-from-top-4 border border-gray-800">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <div className="font-bold text-emerald-400">Successful!</div>
            <div className="text-gray-200 mt-0.5">{toastMessage}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Connected Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect and manage your live Facebook Pages and social media profiles.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-100 self-start">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Meta Graph API v20.0 Ready</span>
        </div>
      </div>

      {/* Rows of Platforms */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-5">
        {platforms.map((platform) => {
          const config = PLATFORM_CONFIGS[platform];
          const platformAccounts = accounts.filter((a) => a.platform === platform);

          return (
            <div
              key={platform}
              className="flex flex-col md:flex-row md:items-center gap-3 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
            >
              {/* Left: Platform Logo + Connect Button */}
              <div className="flex items-center space-x-3 w-56 shrink-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: config.color }}
                >
                  <PlatformLogo platform={platform} className="w-4 h-4" />
                </div>
                <button
                  onClick={() => handleStartConnect(platform)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 hover:bg-gray-800 active:bg-black text-white transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Connect {config.name}</span>
                </button>
              </div>

              {/* Right: Badges / Chips of Connected Accounts */}
              <div className="flex-1 flex flex-wrap items-center gap-2">
                {platformAccounts.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">No account connected yet</span>
                ) : (
                  platformAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="group flex items-center space-x-2 pl-1.5 pr-2 py-1 rounded-full bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 transition-colors text-xs text-emerald-950 font-medium"
                    >
                      {account.avatarUrl ? (
                        <img
                          src={account.avatarUrl}
                          alt={account.displayName}
                          className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-emerald-300"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {account.displayName.charAt(0)}
                        </div>
                      )}
                      <span className="max-w-[140px] truncate">{account.displayName}</span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                        Page
                      </span>
                      <button
                        onClick={() => onRemoveAccount(account.id)}
                        title="Disconnect account"
                        className="text-gray-400 hover:text-rose-600 transition-colors ml-1 p-0.5 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Refresh Buttons */}
      {accounts.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {(['facebook', 'instagram', 'twitter', 'tiktok'] as SocialPlatform[]).map((p) => (
            <button
              key={p}
              onClick={() => handleBatchRefresh(p)}
              disabled={refreshingPlatform === p}
              className="px-3.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-xs font-medium text-gray-700 transition-colors shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshingPlatform === p ? 'animate-spin' : ''}`} />
              <span>Refresh {PLATFORM_CONFIGS[p].name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Buffer-Style Step-by-Step Connection Modal */}
      {connectingPlatform && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#18191a] text-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-800 animate-in fade-in zoom-in-95">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80">
              <div className="flex items-center space-x-3">
                {fbStep === 'confirm' ? (
                  <button
                    onClick={() => {
                      window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(currentWorkspaceId || '')}`;
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer font-medium"
                  >
                    Switch Account
                  </button>
                ) : fbStep === 'auth' ? (
                  <button
                    onClick={() => setFbStep('select_type')}
                    className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setConnectingPlatform(null)}
                    className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Logo interchange indicator (from Image 1 & Image 2) */}
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                    PB
                  </span>
                  <span className="text-gray-500 font-bold">⇄</span>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white bg-[#1877F2]">
                    <PlatformLogo platform="facebook" className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setConnectingPlatform(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FACEBOOK WORKFLOW */}
            {connectingPlatform === 'facebook' ? (
              <div className="p-6">
                {/* STEP 1: Select Facebook Account Type (Matching Image 1) */}
                {fbStep === 'select_type' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        Select Facebook Account Type
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Check out{' '}
                        <a
                          href="https://developers.facebook.com/docs/graph-api"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 underline hover:text-emerald-300"
                        >
                          our guide ↗
                        </a>{' '}
                        to supported channels for more details.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                          <div className="flex-1">
                            <div className="font-semibold text-rose-200">Connection Notice</div>
                            <div className="mt-0.5 leading-relaxed text-[11px] text-rose-300">{verifyError}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setVerifyError(null)}
                          className="text-rose-400 hover:text-white p-1 rounded-sm cursor-pointer shrink-0 ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Option 1: Page */}
                      <div
                        className="p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between border-emerald-500/80 bg-gray-800/60 ring-1 ring-emerald-500/50"
                      >
                        <div className="flex items-start space-x-3.5">
                          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-300 shrink-0">
                            <Flag className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">Page</div>
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                              A page is for businesses, brands, organizations and public figures users &quot;like&quot; or &quot;follow&quot;. Connecting to personal or professional profiles is not supported by Meta.
                            </p>
                          </div>
                        </div>

                        <div className="ml-3 shrink-0 pt-1">
                          <div className="w-4 h-4 rounded-full border border-emerald-500 bg-emerald-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Need Help Expandable Drawer */}
                    {showHelp && (
                      <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-gray-300 space-y-2.5 animate-in fade-in duration-200">
                        <div className="font-semibold text-white flex items-center space-x-1.5">
                          <HelpCircle className="w-4 h-4 text-emerald-400" />
                          <span>Meta Facebook Connection Guide</span>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-gray-400 leading-relaxed">
                          <p>
                            <strong className="text-gray-200">1. Why Pages only?</strong> Meta Graph API strictly requires publishing to Facebook Pages. Direct API posting to personal timelines is prohibited by Meta policies.
                          </p>
                          <p>
                            <strong className="text-gray-200">2. Development Mode:</strong> If your Meta App is currently in Development mode, Meta only allows users who are added under <strong className="text-emerald-400">Meta Developer Console &gt; App Roles &gt; Testers</strong> to authenticate. Add your account as a Tester, or complete App Review for public live mode.
                          </p>
                        </div>
                        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Want to test immediately with a Page Token?</span>
                          <button
                            onClick={() => setFbStep('auth')}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                          >
                            Enter Token Manually →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Bar (Matching Image 1) */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>Need Help</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        onClick={() => {
                          window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(currentWorkspaceId || '')}`;
                        }}
                        className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-gray-950 font-bold transition-colors cursor-pointer shadow-sm"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Authenticate Screen (Developer manual fallback) */}
                {fbStep === 'auth' && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        Connect Facebook Page
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Connect directly via official Facebook login with zero manual tokens.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                        <span className="leading-relaxed">{verifyError}</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Primary 1-Click Button (Buffer Style) */}
                      <button
                        onClick={() => {
                          window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(currentWorkspaceId || '')}`;
                        }}
                        className="w-full py-3 px-4 rounded-xl font-bold bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1464cf] text-white flex items-center justify-center space-x-2 text-sm shadow-md transition-all cursor-pointer"
                      >
                        <PlatformLogo platform="facebook" className="w-5 h-5 text-white" />
                        <span>Continue with Facebook</span>
                      </button>

                      <div className="flex items-center my-3 text-gray-500 text-xs">
                        <div className="flex-1 border-t border-gray-800"></div>
                        <span className="px-3 uppercase font-semibold text-[10px] text-gray-500">
                          or enter Page Access Token / ID
                        </span>
                        <div className="flex-1 border-t border-gray-800"></div>
                      </div>

                      <div className="space-y-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800/80">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-300">
                              Facebook Page Access Token
                            </label>
                            <a
                              href="https://developers.facebook.com/tools/explorer/"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-400 hover:underline"
                            >
                              Explorer ↗
                            </a>
                          </div>
                          <textarea
                            rows={2}
                            value={fbAccessToken}
                            onChange={(e) => setFbAccessToken(e.target.value)}
                            placeholder="EAA... (Paste Page Token if testing without App OAuth)"
                            className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-700 bg-gray-950 text-white placeholder:text-gray-600 focus:outline-hidden focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-1">
                            Facebook Page ID
                          </label>
                          <input
                            type="text"
                            value={fbPageId}
                            onChange={(e) => setFbPageId(e.target.value)}
                            placeholder="e.g. 122149488525072386"
                            className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-700 bg-gray-950 text-white placeholder:text-gray-600 focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <button
                        onClick={() => setFbStep('select_type')}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Back
                      </button>

                      <button
                        onClick={handleVerifyFacebookPages}
                        disabled={isVerifying || !fbAccessToken.trim()}
                        className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-white transition-colors flex items-center space-x-1.5 disabled:opacity-40"
                      >
                        {isVerifying && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isVerifying ? 'Verifying...' : 'Find & Select Account'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Confirm your Account (Matching Image 2) */}
                {fbStep === 'confirm' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        Confirm your Account
                      </h2>
                    </div>

                    {/* Discovered Pages List (Matching Image 2) */}
                    <div className="space-y-3">
                      {discoveredPages.map((page) => {
                        const isChecked = selectedPageIds.includes(page.id);
                        return (
                          <div
                            key={page.id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedPageIds(selectedPageIds.filter((id) => id !== page.id));
                              } else {
                                setSelectedPageIds([...selectedPageIds, page.id]);
                              }
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                              isChecked
                                ? 'border-[#22c55e] bg-[#141b16] ring-1 ring-[#22c55e]/60 shadow-xs'
                                : 'border-gray-800 bg-gray-900/60 hover:bg-gray-800/40'
                            }`}
                          >
                            <div className="flex items-center space-x-3.5">
                              {page.avatarUrl ? (
                                <img
                                  src={page.avatarUrl}
                                  alt={page.name}
                                  className="w-11 h-11 rounded-xl object-cover ring-1 ring-gray-700"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                                  {page.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold text-white leading-tight flex items-center space-x-1.5">
                                  <span>{page.name}</span>
                                  <PlatformLogo platform={page.platform || 'facebook'} className="w-3.5 h-3.5 text-gray-300" />
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5 capitalize">
                                  {page.platform === 'instagram' ? 'Instagram Business Account' : 'Facebook Page'}
                                </div>
                              </div>
                            </div>

                            {/* Checkbox (Matching Image 2) */}
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'border-[#22c55e] bg-[#22c55e] text-black font-bold'
                                  : 'border-gray-600'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Need Help Expandable Drawer */}
                    {showHelp && (
                      <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-gray-300 space-y-2.5 animate-in fade-in duration-200">
                        <div className="font-semibold text-white flex items-center space-x-1.5">
                          <HelpCircle className="w-4 h-4 text-emerald-400" />
                          <span>Connected Page Information</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          By clicking <strong>Finish Connection</strong>, your Facebook Page access token will be securely stored in your isolated workspace. You will be able to schedule, publish images, text, and videos with automatic validation.
                        </p>
                      </div>
                    )}

                    {/* Bottom Action Bar (Matching Image 2) */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>Need Help</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        onClick={handleFinishConnection}
                        disabled={selectedPageIds.length === 0}
                        className="px-7 py-2.5 rounded-xl text-xs font-bold bg-black hover:bg-gray-800 active:bg-gray-900 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Other Platforms (Instagram, Twitter, etc.) */
              <div className="p-6 space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Connect {PLATFORM_CONFIGS[connectingPlatform].name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter your channel username to link your account.
                  </p>
                </div>

                {verifyError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 text-xs text-rose-300 rounded-xl">
                    {verifyError}
                  </div>
                )}

                {connectingPlatform === 'instagram' && (
                  <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-center space-y-2">
                    <div className="text-xs font-semibold text-white">Recommended: Connect via Official Meta Login</div>
                    <p className="text-[11px] text-gray-400">Directly link your verified Instagram accounts with automatic token refreshes.</p>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(currentWorkspaceId || '')}&platform=instagram`;
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#E4405F] hover:bg-[#d63350] text-white flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <PlatformLogo platform="instagram" className="w-3.5 h-3.5" />
                      <span>Authorize via Meta</span>
                    </button>
                    <div className="text-[10px] text-gray-500 pt-1">or enter username below for preview mode:</div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Account Handle / Username
                    </label>
                    <input
                      type="text"
                      value={genericHandle}
                      onChange={(e) => setGenericHandle(e.target.value)}
                      placeholder="@yourhandle"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder:text-gray-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-800">
                  <button
                    onClick={() => setConnectingPlatform(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnectOtherPlatform}
                    disabled={!genericHandle.trim()}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-black hover:bg-gray-800 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
