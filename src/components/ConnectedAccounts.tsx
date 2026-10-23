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
  ChevronDown,
  ArrowLeft,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { PLATFORM_CONFIGS } from '@/lib/constants';
import { DeleteChannelModal } from './DeleteChannelModal';

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
  platform?: 'facebook' | 'instagram' | 'youtube';
  username?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  followersCount?: number;
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
  const [channelToDelete, setChannelToDelete] = useState<SocialAccount | null>(null);

  // Facebook Connection Flow Steps:
  // 1: 'select_type' (Page vs Group)
  // 2: 'auth' (OAuth or API Token)
  // 3: 'confirm' (Confirm your Account / Pages list)
  const [fbStep, setFbStep] = useState<'select_type' | 'auth' | 'confirm'>('select_type');

  // Instagram Connection Flow Steps (Matching Buffer Screenshots):
  // 1: 'select_type' (Image 1: Professional vs Personal)
  // 2: 'check_account' (Image 2: First, Check Your Instagram Account)
  // 3: 'convert_guide' (Image 3: Change to professional account?)
  // 4: 'confirm' (Confirm your Account / Discovered Instagram Accounts)
  const [igStep, setIgStep] = useState<'select_type' | 'check_account' | 'convert_guide' | 'confirm'>('select_type');
  const [ytStep, setYtStep] = useState<'auth' | 'confirm'>('auth');


  // Facebook Token and Form state
  const [fbPageId, setFbPageId] = useState('122149488525072386');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Discovered Facebook Pages & Instagram Profiles from Meta
  const [discoveredPages, setDiscoveredPages] = useState<DetectedPage[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [noInstagramFound, setNoInstagramFound] = useState(false);

  // Instagram custom handle & manual API overrides
  const [customIgHandle, setCustomIgHandle] = useState('');
  const [manualIgToken, setManualIgToken] = useState('');
  const [manualIgId, setManualIgId] = useState('');
  const [showManualIg, setShowManualIg] = useState(false);

  // Other platform states
  const [genericHandle, setGenericHandle] = useState('');
  const [genericToken, setGenericToken] = useState('');

  // UI Feedback
  const [refreshingPlatform, setRefreshingPlatform] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const platforms: SocialPlatform[] = [
    'facebook',
    'instagram',
    'youtube',
    'twitter',
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

    // Check if returning from Meta OAuth
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isFbSuccess = urlParams.get('fb_connect_success');
      const isIgSuccess = urlParams.get('ig_connect_success');
      const isYtSuccess = urlParams.get('youtube_connect_success');
      const isTwSuccess = urlParams.get('twitter_connect_success');
      const noIgFound = urlParams.get('no_instagram_found');
      const discoveredJson = urlParams.get('discovered_pages') || urlParams.get('discovered_channels');
      const returningPlatform = (urlParams.get('platform') as SocialPlatform) || (isIgSuccess || noIgFound ? 'instagram' : isYtSuccess ? 'youtube' : isTwSuccess ? 'twitter' : 'facebook');
      const authError = urlParams.get('error');
      const authNotice = urlParams.get('notice');

      if (authError) {
        setVerifyError(decodeURIComponent(authError));
        setConnectingPlatform(returningPlatform);
        if (returningPlatform === 'instagram') {
          setIgStep('select_type');
        } else if (returningPlatform === 'youtube') {
          setYtStep('auth');
        } else {
          setFbStep('select_type');
        }
      } else if (authNotice) {
        setToastMessage(decodeURIComponent(authNotice));
        setTimeout(() => setToastMessage(null), 4500);
      } else if (isTwSuccess && discoveredJson) {
        // STRICTLY X (TWITTER)
        try {
          const parsedAccounts: DetectedPage[] = JSON.parse(discoveredJson);
          if (parsedAccounts.length > 0) {
            setDiscoveredPages(parsedAccounts);
            setSelectedPageIds(parsedAccounts.map((p) => p.id));
            setConnectingPlatform('twitter');
          }
        } catch (e) {
          console.error('Failed to parse discovered X accounts', e);
        }
      } else if (isYtSuccess && discoveredJson) {
        // STRICTLY YOUTUBE
        try {
          const parsedChannels: DetectedPage[] = JSON.parse(discoveredJson);
          if (parsedChannels.length > 0) {
            setDiscoveredPages(parsedChannels);
            setSelectedPageIds(parsedChannels.map((p) => p.id));
            setConnectingPlatform('youtube');
            setYtStep('confirm');
          }
        } catch (e) {
          console.error('Failed to parse discovered YouTube channels', e);
        }
      } else if (noIgFound) {
        setConnectingPlatform('instagram');
        setIgStep('confirm');
        setNoInstagramFound(true);
        setDiscoveredPages([]);
      } else if (isFbSuccess && discoveredJson) {
        // STRICTLY FACEBOOK: Never hijack to Instagram
        try {
          const parsedPages: DetectedPage[] = JSON.parse(discoveredJson);
          if (parsedPages.length > 0) {
            const fbOnly = parsedPages.filter((p) => p.platform !== 'instagram');
            const targetPages = fbOnly.length > 0 ? fbOnly : parsedPages;
            setDiscoveredPages(targetPages);
            setSelectedPageIds(targetPages.map((p) => p.id));
            setConnectingPlatform('facebook');
            setFbStep('confirm');
          }
        } catch (e) {
          console.error('Failed to parse discovered Facebook pages', e);
        }
      } else if (isIgSuccess && discoveredJson) {
        // STRICTLY INSTAGRAM: Never hijack to Facebook
        try {
          const parsedPages: DetectedPage[] = JSON.parse(discoveredJson);
          if (parsedPages.length > 0) {
            setDiscoveredPages(parsedPages);
            setSelectedPageIds(parsedPages.map((p) => p.id));
            setConnectingPlatform('instagram');
            setIgStep('confirm');
            setNoInstagramFound(false);
            if (parsedPages[0]?.name) {
              setCustomIgHandle(parsedPages[0].name.replace(/^@/, ''));
            }
          } else {
            setConnectingPlatform('instagram');
            setIgStep('confirm');
            setNoInstagramFound(true);
          }
        } catch (e) {
          console.error('Failed to parse discovered Instagram accounts', e);
        }
      }

      if (authError || authNotice || isFbSuccess || isIgSuccess || noIgFound || isYtSuccess || isTwSuccess) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleStartConnect = (platform: SocialPlatform) => {
    setConnectingPlatform(platform);
    setVerifyError(null);
    setShowHelp(false);
    setDiscoveredPages([]);
    setSelectedPageIds([]);
    setNoInstagramFound(false);
    setCustomIgHandle('');
    setManualIgId('');
    setManualIgToken('');
    setGenericHandle('');
    setGenericToken('');

    if (platform === 'facebook') {
      setFbStep('select_type');
    } else if (platform === 'instagram') {
      setIgStep('select_type');
    } else if (platform === 'youtube') {
      setYtStep('auth');
    }
  };

  // Facebook Manual Verify
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
      setSelectedPageIds(pages.map((p) => p.id));
      setFbStep('confirm');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error verifying Facebook token';
      setVerifyError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Finish Connection: Save selected accounts, preserve session, show dynamic toast
  const handleFinishConnection = () => {
    // 1. If connecting Instagram
    if (connectingPlatform === 'instagram') {
      const selected = discoveredPages.filter((p) => selectedPageIds.includes(p.id));
      const targetPage = selected[0] || discoveredPages[0];

      const manualId = manualIgId.trim();
      const finalIgId = manualId || targetPage?.id;

      if (!finalIgId && !customIgHandle.trim()) {
        setVerifyError('No Instagram account detected or entered. Please connect an account or enter your username.');
        return;
      }

      const rawHandle = customIgHandle.trim() || targetPage?.name?.replace(/^@/, '') || 'instagram_account';
      const cleanHandle = rawHandle.replace(/^@/, '').toLowerCase().replace(/\s+/g, '');
      const igId = finalIgId || cleanHandle;
      const token = manualIgToken.trim() || targetPage?.accessToken || fbAccessToken.trim();

      const newAcc: SocialAccount = {
        id: `ig_${igId}`,
        platform: 'instagram',
        username: cleanHandle,
        displayName: `@${cleanHandle}`,
        avatarUrl:
          targetPage?.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        accountType: 'business',
        status: 'connected',
        followersCount: 0,
        externalId: igId,
        accessToken: token,
        pageId: targetPage?.id || igId,
      };

      onAddAccount(newAcc);

      setConnectingPlatform(null);
      setDiscoveredPages([]);
      setSelectedPageIds([]);
      setNoInstagramFound(false);

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/dashboard');
      }

      const dynamicMessage = `Your Instagram account (@${cleanHandle}) has been successfully connected!`;
      setToastMessage(dynamicMessage);
      setTimeout(() => setToastMessage(null), 5000);

      if (onShowSuccessToast) {
        onShowSuccessToast(dynamicMessage);
      }

      if (onNavigateToTab) {
        onNavigateToTab('new-post');
      }
      return;
    }

    // 2. YouTube Flow
    if (connectingPlatform === 'youtube') {
      const selected = discoveredPages.filter((p) => selectedPageIds.includes(p.id));
      const target = selected[0] || discoveredPages[0];

      if (!target) {
        setVerifyError('Please select a YouTube channel to connect.');
        return;
      }

      const cleanHandle = (target.username || target.name).replace(/^@/, '').toLowerCase().replace(/\s+/g, '');
      const newAcc: SocialAccount = {
        id: `yt_${target.id}`,
        platform: 'youtube',
        username: cleanHandle,
        displayName: target.name,
        avatarUrl:
          target.avatarUrl ||
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
        accountType: 'channel',
        status: 'connected',
        followersCount: target.followersCount || 0,
        externalId: target.id,
        accessToken: target.accessToken,
        refreshToken: target.refreshToken,
        tokenExpiresAt: target.tokenExpiresAt,
        pageId: target.id,
      };

      onAddAccount(newAcc);

      setConnectingPlatform(null);
      setDiscoveredPages([]);
      setSelectedPageIds([]);

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/dashboard');
      }

      const dynamicMessage = `Your YouTube channel (${target.name}) has been successfully connected!`;
      setToastMessage(dynamicMessage);
      setTimeout(() => setToastMessage(null), 5000);

      if (onShowSuccessToast) {
        onShowSuccessToast(dynamicMessage);
      }

      if (onNavigateToTab) {
        onNavigateToTab('new-post');
      }
      return;
    }

    // 3. X (Twitter) Flow
    if (connectingPlatform === 'twitter') {
      const selected = discoveredPages.filter((p) => selectedPageIds.includes(p.id));
      const target = selected[0] || discoveredPages[0];

      if (!target) {
        setVerifyError('Please select an X account to connect.');
        return;
      }

      const cleanHandle = (target.username || target.name).replace(/^@/, '').toLowerCase().replace(/\s+/g, '');
      const newAcc: SocialAccount = {
        id: `tw_${target.id}`,
        platform: 'twitter',
        username: cleanHandle,
        displayName: target.name,
        avatarUrl:
          target.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        accountType: 'profile',
        status: 'connected',
        followersCount: target.followersCount || 0,
        externalId: target.id,
        accessToken: target.accessToken,
        refreshToken: target.refreshToken,
        tokenExpiresAt: target.tokenExpiresAt,
      };

      onAddAccount(newAcc);

      setConnectingPlatform(null);
      setDiscoveredPages([]);
      setSelectedPageIds([]);

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/dashboard');
      }

      const dynamicMessage = `Your X account (@${cleanHandle}) has been successfully connected!`;
      setToastMessage(dynamicMessage);
      setTimeout(() => setToastMessage(null), 5000);

      if (onShowSuccessToast) {
        onShowSuccessToast(dynamicMessage);
      }

      if (onNavigateToTab) {
        onNavigateToTab('new-post');
      }
      return;
    }

    // 4. Facebook Flow
    const selected = discoveredPages.filter((p) => selectedPageIds.includes(p.id));
    if (selected.length === 0) {
      setVerifyError('Please select at least one Account or Page to connect.');
      return;
    }

    selected.forEach((page) => {
      const cleanUsername = page.name.replace(/^@/, '').toLowerCase().replace(/\s+/g, '');
      const newAcc: SocialAccount = {
        id: `fb_${page.id}`,
        platform: 'facebook',
        username: cleanUsername,
        displayName: page.name,
        avatarUrl:
          page.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        accountType: 'page',
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

    const dynamicMessage = 'Your Facebook account has been successfully connected!';
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
            Connect and manage your live Facebook Pages, Instagram accounts, and social channels.
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 hover:bg-gray-800 active:bg-black text-white transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
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
                        {account.platform === 'instagram' ? 'IG' : 'Page'}
                      </span>
                      <button
                        onClick={() => setChannelToDelete(account)}
                        title="Disconnect account"
                        className="text-gray-400 hover:text-rose-600 transition-colors ml-1 p-0.5 rounded-full cursor-pointer"
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
          {(['facebook', 'instagram', 'youtube', 'twitter'] as SocialPlatform[]).map((p) => (
            <button
              key={p}
              onClick={() => handleBatchRefresh(p)}
              disabled={refreshingPlatform === p}
              className="px-3.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-xs font-medium text-gray-700 transition-colors shadow-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${refreshingPlatform === p ? 'animate-spin' : ''}`} />
              <span>Refresh {PLATFORM_CONFIGS[p].name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Buffer-Style Step-by-Step Connection Modal */}
      {connectingPlatform && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#18191a] text-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-800 animate-in fade-in zoom-in-95">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80">
              <div className="flex items-center space-x-3">
                {/* Back navigation logic */}
                {connectingPlatform === 'instagram' ? (
                  igStep === 'confirm' ? (
                    <button
                      onClick={() => {
                        window.location.href = `/api/auth/instagram?workspace_id=${encodeURIComponent(
                          currentWorkspaceId || ''
                        )}`;
                      }}
                      className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer font-medium"
                    >
                      Switch Account
                    </button>
                  ) : igStep === 'convert_guide' ? (
                    <button
                      onClick={() => setIgStep('check_account')}
                      className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  ) : igStep === 'check_account' ? (
                    <button
                      onClick={() => setIgStep('select_type')}
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
                  )
                ) : connectingPlatform === 'facebook' ? (
                  fbStep === 'confirm' ? (
                    <button
                      onClick={() => {
                        window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(
                          currentWorkspaceId || ''
                        )}`;
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
                  )
                ) : (
                  <button
                    onClick={() => setConnectingPlatform(null)}
                    className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Logo interchange indicator (Matching Images 1, 2, 3) */}
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                    PB
                  </span>
                  <span className="text-gray-500 font-bold">⇄</span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                      connectingPlatform === 'instagram'
                        ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
                        : 'bg-[#1877F2]'
                    }`}
                  >
                    <PlatformLogo platform={connectingPlatform} className="w-3.5 h-3.5" />
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

            {/* INSTAGRAM WORKFLOW (Recreating Buffer UX Exactly from Screenshots) */}
            {connectingPlatform === 'instagram' ? (
              <div className="p-6">
                {/* STEP 1: How would you like to connect your Instagram Account? (Image 1) */}
                {igStep === 'select_type' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        How would you like to connect your Instagram Account?
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Choose the connection method that best fits your workflow.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                          <div className="flex-1">
                            <div className="font-semibold text-rose-200">Notice</div>
                            <div className="mt-0.5 leading-relaxed text-[11px] text-rose-300">{verifyError}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setVerifyError(null)}
                          className="text-rose-400 hover:text-white p-1 shrink-0 ml-2 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-3.5">
                      {/* Option 1: Professional (Business & Creator) - Featured (Image 1) */}
                      <div className="p-4 rounded-2xl border border-emerald-500/60 bg-gradient-to-b from-[#1c221e] to-[#141815] ring-1 ring-emerald-500/40 relative shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-bold text-white flex items-center space-x-2">
                            <span>Professional (Business & Creator)</span>
                          </div>
                          <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Recommended
                          </span>
                        </div>

                        <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                          Unlock direct automated scheduling, reels, carousels, and in-depth performance analytics.
                        </p>

                        {/* Feature Bullet Points (Image 1) */}
                        <div className="space-y-1.5 mb-4 text-xs text-gray-300">
                          <div className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                            <span>Automatic &amp; Notification-based Posting</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                            <span>Schedule Reels, Carousels, &amp; Stories</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                            <span>Community replies &amp; engagement</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                            <span>Post metrics &amp; performance tracking</span>
                          </div>
                        </div>

                        {/* Green Connect Button (Image 1) - Direct Instagram OAuth */}
                        <button
                          onClick={() => {
                            window.location.href = `/api/auth/instagram?workspace_id=${encodeURIComponent(
                              currentWorkspaceId || ''
                            )}`;
                          }}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#22c55e] hover:bg-[#1eb355] active:bg-[#199f4a] text-black transition-all shadow-sm cursor-pointer flex items-center justify-center space-x-2"
                        >
                          <span>Connect to Instagram</span>
                        </button>

                        <div className="mt-2 text-center">
                          <button
                            type="button"
                            onClick={() => setIgStep('check_account')}
                            className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Pre-check account requirements →
                          </button>
                        </div>

                        {/* Helper note (Image 1) */}
                        <div className="mt-2.5 flex items-start space-x-1.5 text-[11px] text-gray-400">
                          <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Instagram will prompt you to easily convert to a professional account if needed.</span>
                        </div>

                        {/* Link to connect via Facebook (Image 1) */}
                        <div className="mt-2.5 pt-2.5 border-t border-gray-800/80 text-center">
                          <button
                            onClick={() => {
                              window.location.href = `/api/auth/instagram?mode=facebook&workspace_id=${encodeURIComponent(
                                currentWorkspaceId || ''
                              )}`;
                            }}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                          >
                            Connect Instagram through Facebook if your Instagram account is currently linked to Facebook →
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                      <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>Need Help</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        onClick={() => setConnectingPlatform(null)}
                        className="text-xs text-gray-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Expandable Help */}
                    {showHelp && (
                      <div className="p-3.5 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-gray-300 space-y-2 animate-in fade-in">
                        <div className="font-semibold text-white flex items-center space-x-1.5">
                          <HelpCircle className="w-4 h-4 text-emerald-400" />
                          <span>Meta API Requirements</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Meta Graph API strictly requires a Professional (Creator or Business) account to support direct automated posting. Converting in the Instagram app is free, takes under 30 seconds, and lets you keep all your photos and followers.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: First, Check Your Instagram Account (Image 2) */}
                {igStep === 'check_account' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        First, Check Your Instagram Account
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Make sure you&apos;re signed in to the Instagram account you want to connect
                      </p>
                    </div>

                    {/* 3 Numbered Steps Box (Exact match to Image 2) */}
                    <div className="p-5 rounded-2xl bg-[#141517] border border-gray-800 space-y-4">
                      <div className="flex items-start space-x-3.5">
                        <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 text-gray-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          1
                        </div>
                        <div className="text-xs text-gray-200 leading-relaxed">
                          Open the Instagram app or website in your browser.
                        </div>
                      </div>

                      <div className="flex items-start space-x-3.5">
                        <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 text-gray-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          2
                        </div>
                        <div className="text-xs text-gray-200 leading-relaxed">
                          Go to your <strong className="text-white">Profile</strong> &gt;{' '}
                          <strong className="text-white">Edit Profile</strong> (or{' '}
                          <strong className="text-white">Settings and privacy</strong>).
                        </div>
                      </div>

                      <div className="flex items-start space-x-3.5">
                        <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 text-gray-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          3
                        </div>
                        <div className="text-xs text-gray-200 leading-relaxed">
                          Confirm your account type is set to{' '}
                          <strong className="text-emerald-400">Professional (Business or Creator)</strong>.
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons (Image 2) */}
                    <div className="space-y-2.5">
                      <button
                        onClick={() => window.open('https://www.instagram.com', '_blank')}
                        className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#22c55e] hover:bg-[#1eb355] text-black flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <span>Open Instagram</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          window.location.href = `/api/auth/instagram?workspace_id=${encodeURIComponent(
                            currentWorkspaceId || ''
                          )}`;
                        }}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-800/90 hover:bg-gray-700 border border-gray-700 text-white transition-colors cursor-pointer"
                      >
                        Skip Check and Connect to Instagram
                      </button>
                    </div>

                    <div className="pt-1 text-center">
                      <button
                        onClick={() => setIgStep('convert_guide')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                      >
                        Not a Professional account yet? Learn how to convert in 30 seconds →
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                      <button
                        onClick={() => setIgStep('select_type')}
                        className="text-xs text-gray-400 hover:text-white cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setConnectingPlatform(null)}
                        className="text-xs text-gray-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Change to professional account? (Image 3) */}
                {igStep === 'convert_guide' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        Change to professional account?
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        You need a professional Instagram account to connect Instagram to PostBridge
                      </p>
                    </div>

                    {/* Simulated Native Instagram Dialog (Faithful recreation of Image 3) */}
                    <div className="bg-[#242527] rounded-2xl p-5 border border-gray-700/80 max-w-sm mx-auto shadow-xl text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center mx-auto text-white shadow-md">
                        <PlatformLogo platform="instagram" className="w-6 h-6" />
                      </div>

                      <div className="font-bold text-white text-sm">Change to professional account?</div>

                      <p className="text-xs text-gray-300 leading-relaxed px-1">
                        You need a professional Instagram account to connect Instagram to PostBridge. Anyone will be able
                        to see your posts and reels, but you can change who sees them anytime in settings.
                      </p>

                      <div className="pt-2 flex items-center justify-center space-x-2">
                        <button
                          onClick={() => window.open('https://www.instagram.com/accounts/edit/', '_blank')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#0095F6] hover:bg-[#1877F2] text-white transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => setIgStep('check_account')}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-700/80 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    {/* 30-Second Quick Instructions */}
                    <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 text-xs text-gray-300 space-y-2">
                      <div className="font-semibold text-white flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>30-Second Conversion Steps:</span>
                      </div>
                      <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-400 leading-relaxed">
                        <li>
                          In the Instagram app, go to <strong className="text-gray-200">Settings and privacy</strong>
                        </li>
                        <li>
                          Tap <strong className="text-gray-200">Account type and tools</strong> &gt;{' '}
                          <strong className="text-emerald-400">Switch to Professional Account</strong>
                        </li>
                        <li>
                          Choose a category (<strong className="text-gray-200">Creator</strong> or{' '}
                          <strong className="text-gray-200">Business</strong>)
                        </li>
                        <li>Link to your Facebook Page (required for Meta Graph API access)</li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          window.location.href = `/api/auth/instagram?workspace_id=${encodeURIComponent(
                            currentWorkspaceId || ''
                          )}`;
                        }}
                        className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#22c55e] hover:bg-[#1eb355] text-black flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <span>Ready! Connect to Instagram</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                      <button
                        onClick={() => setIgStep('check_account')}
                        className="text-xs text-gray-400 hover:text-white cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setConnectingPlatform(null)}
                        className="text-xs text-gray-400 hover:text-white cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Confirm your Account */}
                {igStep === 'confirm' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        Confirm Instagram Account
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Connect your Instagram Professional profile with official Meta Graph API v20.0 publishing.
                      </p>
                    </div>

                    {/* Case 1: No Instagram account found linked to Meta assets */}
                    {(noInstagramFound || discoveredPages.length === 0) ? (
                      <div className="p-5 rounded-2xl border border-amber-500/40 bg-[#191612] space-y-4">
                        <div className="flex items-start space-x-3.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">No Linked Instagram Account Found</div>
                            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                              Your Meta account was authenticated, but no Instagram Professional (Business or Creator) account is linked to your Facebook Page.
                            </p>
                          </div>
                        </div>

                        {/* Step-by-step resolution */}
                        <div className="p-3.5 rounded-xl bg-black/40 border border-gray-800 text-xs text-gray-300 space-y-2">
                          <div className="font-semibold text-white flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Quick 30-Second Fix in Instagram App:</span>
                          </div>
                          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-400 leading-relaxed">
                            <li>Open the Instagram app on your phone and go to your profile.</li>
                            <li>Tap <strong className="text-gray-200">Edit Profile</strong>.</li>
                            <li>Under <strong className="text-gray-200">Public Business Information</strong>, tap <strong className="text-emerald-400">Page</strong>.</li>
                            <li>Connect your Facebook Page (e.g. <em>U NOS Digital marketing</em>).</li>
                          </ol>
                        </div>

                        <div className="space-y-2 pt-1">
                          <button
                            onClick={() => {
                              window.location.href = `/api/auth/instagram?mode=facebook&workspace_id=${encodeURIComponent(
                                currentWorkspaceId || ''
                              )}`;
                            }}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#22c55e] hover:bg-[#1eb355] text-black transition-colors cursor-pointer flex items-center justify-center space-x-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry Connecting Instagram via Facebook</span>
                          </button>

                          <button
                            onClick={() => setIgStep('convert_guide')}
                            className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer"
                          >
                            Learn How to Convert Account to Professional
                          </button>
                        </div>

                        {/* Manual entry drawer if user has an account handle / ID */}
                        <div className="pt-2 border-t border-gray-800/80">
                          <button
                            type="button"
                            onClick={() => setShowManualIg(!showManualIg)}
                            className="text-xs text-gray-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Or enter your Instagram handle manually</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showManualIg ? 'rotate-180' : ''}`} />
                          </button>

                          {showManualIg && (
                            <div className="mt-3 p-3.5 rounded-xl bg-gray-950/80 border border-gray-800 text-xs space-y-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                  Instagram Username / Handle
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-2 text-xs text-gray-500 font-bold">@</span>
                                  <input
                                    type="text"
                                    value={customIgHandle}
                                    onChange={(e) => setCustomIgHandle(e.target.value.replace(/^@/, '').trim())}
                                    placeholder="your_handle"
                                    className="w-full text-xs pl-7 pr-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 text-white placeholder:text-gray-600 focus:outline-hidden focus:border-emerald-500"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                                  Instagram Business Account ID (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={manualIgId}
                                  onChange={(e) => setManualIgId(e.target.value.trim())}
                                  placeholder="e.g. 17841400000000000"
                                  className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 text-white placeholder:text-gray-600 focus:outline-hidden focus:border-emerald-500"
                                />
                              </div>

                              <button
                                onClick={handleFinishConnection}
                                disabled={!customIgHandle.trim()}
                                className="w-full py-2 rounded-xl text-xs font-bold bg-[#22c55e] hover:bg-[#1eb355] disabled:opacity-50 text-black transition-colors cursor-pointer"
                              >
                                Connect Instagram Account
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Case 2: Genuine Discovered Instagram Account(s) */
                      <div className="space-y-4">
                        <div className="space-y-2.5">
                          {discoveredPages.map((page) => {
                            const isSelected = selectedPageIds.includes(page.id);
                            return (
                              <div
                                key={page.id}
                                onClick={() => {
                                  setSelectedPageIds([page.id]);
                                  if (page.name) {
                                    setCustomIgHandle(page.name.replace(/^@/, ''));
                                  }
                                }}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                  isSelected
                                    ? 'border-emerald-500/70 bg-gradient-to-b from-[#1b221d] to-[#141815] ring-1 ring-emerald-500/50 shadow-sm'
                                    : 'border-gray-800 bg-[#161719] hover:border-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-3.5">
                                  {page.avatarUrl ? (
                                    <img
                                      src={page.avatarUrl}
                                      alt={page.name}
                                      className="w-12 h-12 rounded-xl object-cover border border-gray-700 shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                                      <PlatformLogo platform="instagram" className="w-6 h-6" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-bold text-white flex items-center space-x-2">
                                      <span>{page.name.startsWith('@') ? page.name : `@${page.name}`}</span>
                                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold uppercase">
                                        Verified
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      Instagram Professional Profile (ID: {page.id})
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'bg-[#22c55e] text-black font-bold'
                                      : 'border border-gray-700 bg-gray-900 text-transparent'
                                  }`}
                                >
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Editable Handle */}
                        <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800">
                          <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                            Instagram Username / Handle
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs text-gray-500 font-bold">@</span>
                            <input
                              type="text"
                              value={customIgHandle}
                              onChange={(e) => setCustomIgHandle(e.target.value.replace(/^@/, '').trim())}
                              placeholder="your_handle"
                              className="w-full text-xs pl-7 pr-3 py-1.5 rounded-lg border border-gray-700 bg-gray-950 text-white placeholder:text-gray-600 focus:outline-hidden focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleFinishConnection}
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#22c55e] hover:bg-[#1eb355] text-black transition-colors shadow-sm cursor-pointer"
                        >
                          Save Instagram Account
                        </button>
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>Need Help</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
                      </button>

                      {discoveredPages.length > 0 ? (
                        <button
                          onClick={handleFinishConnection}
                          className="px-7 py-2.5 rounded-xl text-xs font-bold bg-[#22c55e] hover:bg-[#1eb355] text-black transition-colors shadow-sm cursor-pointer"
                        >
                          Save Instagram Account
                        </button>
                      ) : (
                        <button
                          onClick={() => setConnectingPlatform(null)}
                          className="px-5 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white cursor-pointer"
                        >
                          Close
                        </button>
                      )}
                    </div>

                    {showHelp && (
                      <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 text-xs text-gray-300 space-y-2 animate-in fade-in">
                        <div className="font-semibold text-white flex items-center space-x-1.5">
                          <HelpCircle className="w-4 h-4 text-emerald-400" />
                          <span>Instagram Connection &amp; Publishing Guide</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Your Instagram account is authorized through your Meta Facebook account. By clicking <strong>Save Instagram Account</strong>, PostBridge will save your Instagram profile directly into your workspace. You can schedule Reels, images, and videos with automatic Meta Graph API publishing.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : connectingPlatform === 'facebook' ? (
              /* FACEBOOK WORKFLOW */
              <div className="p-6">
                {/* STEP 1: Select Facebook Account Type */}
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
                      <div className="p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between border-emerald-500/80 bg-gray-800/60 ring-1 ring-emerald-500/50">
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

                    {/* Bottom Action Bar */}
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
                          window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(
                            currentWorkspaceId || ''
                          )}`;
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
                      {/* Primary 1-Click Button */}
                      <button
                        onClick={() => {
                          window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(
                            currentWorkspaceId || ''
                          )}`;
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
                        className="text-xs text-gray-400 hover:text-white cursor-pointer"
                      >
                        Back
                      </button>

                      <button
                        onClick={handleVerifyFacebookPages}
                        disabled={isVerifying || !fbAccessToken.trim()}
                        className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-white transition-colors flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
                      >
                        {isVerifying && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isVerifying ? 'Verifying...' : 'Find & Select Account'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Confirm your Account */}
                {fbStep === 'confirm' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        Confirm your Account
                      </h2>
                    </div>

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
                                  <PlatformLogo platform="facebook" className="w-3.5 h-3.5 text-gray-300" />
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  Facebook Page
                                </div>
                              </div>
                            </div>

                            {/* Checkbox */}
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

                    {/* Bottom Action Bar */}
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
                        className="px-7 py-2.5 rounded-xl text-xs font-bold bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1464cf] text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        Save Facebook Page
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : connectingPlatform === 'youtube' ? (
              /* YouTube Flow */
              <div className="p-6 space-y-5">
                {ytStep === 'confirm' && discoveredPages.length > 0 ? (
                  /* YouTube Step: Confirm Channel */
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-3">
                        <PlatformLogo platform="youtube" className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Confirm YouTube Channel</h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Select the YouTube channel you want to connect to this workspace.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 text-xs text-rose-300 rounded-xl">
                        {verifyError}
                      </div>
                    )}

                    <div className="space-y-2.5 max-h-60 overflow-y-auto">
                      {discoveredPages.map((channel) => {
                        const isChecked = selectedPageIds.includes(channel.id);
                        return (
                          <div
                            key={channel.id}
                            onClick={() => setSelectedPageIds([channel.id])}
                            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-red-950/30 border-red-500/80 shadow-md ring-1 ring-red-500/40'
                                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {channel.avatarUrl ? (
                                <img
                                  src={channel.avatarUrl}
                                  alt={channel.name}
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">
                                  {channel.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">{channel.name}</h4>
                                <p className="text-xs text-gray-400">
                                  {channel.username || '@channel'}
                                  {typeof channel.followersCount === 'number' && (
                                    <span className="ml-2 text-gray-500">• {channel.followersCount.toLocaleString()} subscribers</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-800">
                      <button
                        onClick={() => {
                          setConnectingPlatform(null);
                          setDiscoveredPages([]);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleFinishConnection}
                        disabled={selectedPageIds.length === 0}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm flex items-center space-x-1.5"
                      >
                        <span>Confirm & Connect Channel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* YouTube Step: Connect OAuth Initiation */
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-3">
                        <PlatformLogo platform="youtube" className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Connect YouTube Channel</h2>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                        Authorize PostBridge to upload videos, schedule YouTube Shorts, and publish content to your channel via the official YouTube Data API v3.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 text-xs text-rose-300 rounded-xl">
                        {verifyError}
                      </div>
                    )}

                    <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl space-y-3">
                      <div className="flex items-start space-x-2.5 text-xs text-gray-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Google OAuth 2.0 Web Server authorization with offline access & automatic token refresh.</span>
                      </div>
                      <div className="flex items-start space-x-2.5 text-xs text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Full support for standard videos (16:9) and YouTube Shorts (&le;60s vertical).</span>
                      </div>
                    </div>

                    <a
                      href={`/api/auth/youtube?workspace_id=${encodeURIComponent(currentWorkspaceId || '')}`}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-colors shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <PlatformLogo platform="youtube" className="w-4 h-4" />
                      <span>Sign in with Google / YouTube</span>
                    </a>

                    <div className="text-center pt-2 border-t border-gray-800">
                      <button
                        type="button"
                        onClick={() => setConnectingPlatform(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : connectingPlatform === 'twitter' ? (
              /* X (Twitter) Dedicated Flow */
              <div className="p-6 space-y-5">
                {discoveredPages.length > 0 ? (
                  /* X Step: Confirm Account */
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto mb-3 border border-gray-700">
                        <PlatformLogo platform="twitter" className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Confirm X (Twitter) Account</h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Confirm the X account you want to connect to this workspace.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 text-xs text-rose-300 rounded-xl">
                        {verifyError}
                      </div>
                    )}

                    <div className="space-y-2.5 max-h-60 overflow-y-auto">
                      {discoveredPages.map((acc) => {
                        const isChecked = selectedPageIds.includes(acc.id);
                        return (
                          <div
                            key={acc.id}
                            onClick={() => setSelectedPageIds([acc.id])}
                            className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-zinc-900 border-white/60 shadow-md ring-1 ring-white/30'
                                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {acc.avatarUrl ? (
                                <img
                                  src={acc.avatarUrl}
                                  alt={acc.name}
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-black border border-gray-700 text-white flex items-center justify-center font-bold">
                                  {acc.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">{acc.name}</h4>
                                <p className="text-xs text-gray-400">
                                  @{acc.username || 'username'}
                                  {typeof acc.followersCount === 'number' && (
                                    <span className="ml-2 text-gray-500">• {acc.followersCount.toLocaleString()} followers</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                isChecked ? 'bg-white border-white text-black' : 'border-gray-700'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-800">
                      <button
                        onClick={() => {
                          setConnectingPlatform(null);
                          setDiscoveredPages([]);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleFinishConnection}
                        disabled={selectedPageIds.length === 0}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer shadow-sm flex items-center space-x-1.5"
                      >
                        <span>Confirm & Connect X</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* X Step: OAuth Initiation */
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto mb-3 border border-gray-700">
                        <PlatformLogo platform="twitter" className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Connect X (Twitter) Account</h2>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                        Authorize PostBridge to publish tweets, schedule posts, and manage your timeline via the official X API v2.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 text-xs text-rose-300 rounded-xl">
                        {verifyError}
                      </div>
                    )}

                    <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl space-y-3">
                      <div className="flex items-start space-x-2.5 text-xs text-gray-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Official X OAuth 2.0 PKCE authentication with offline access & automatic token refresh.</span>
                      </div>
                      <div className="flex items-start space-x-2.5 text-xs text-gray-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Direct publishing of 280-character posts, media previews, and scheduled queueing.</span>
                      </div>
                    </div>

                    <a
                      href={`/api/auth/twitter?workspace_id=${encodeURIComponent(currentWorkspaceId || '')}`}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-white hover:bg-gray-200 active:bg-gray-300 text-black transition-colors shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <PlatformLogo platform="twitter" className="w-4 h-4 text-black" />
                      <span>Sign in with X (Twitter)</span>
                    </a>

                    <div className="text-center pt-2 border-t border-gray-800">
                      <button
                        type="button"
                        onClick={() => setConnectingPlatform(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}


      {/* Delete Channel Modal with required DELETE CHANNEL text */}
      {channelToDelete && (
        <DeleteChannelModal
          isOpen={Boolean(channelToDelete)}
          account={channelToDelete}
          workspaceId={currentWorkspaceId}
          onClose={() => setChannelToDelete(null)}
          onConfirmDelete={async (accountId) => {
            onRemoveAccount(accountId);
            if (onShowSuccessToast) {
              onShowSuccessToast('Channel disconnected and access tokens revoked.');
            }
          }}
        />
      )}
    </div>
  );
};
