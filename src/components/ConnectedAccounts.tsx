'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
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
  Zap,
  Trash2,
  Sparkles,
  Link2,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  Radio,
} from 'lucide-react';
import { PLATFORM_CONFIGS } from '@/lib/constants';
import { DeleteChannelModal } from './DeleteChannelModal';
import { UpgradePlanModal } from '@/components/UpgradePlanModal';
import { SubscriptionService } from '@/lib/subscription';

interface ConnectedAccountsProps {
  accounts: SocialAccount[];
  posts?: any[];
  currentWorkspaceId?: string;
  onAddAccount: (account: SocialAccount) => Promise<{ success: boolean; isDuplicate?: boolean; message?: string } | void> | void;
  onRemoveAccount: (id: string) => void;
  onRefreshAccount: (id: string) => void;
  onNavigateToTab?: (tab: any) => void;
  onShowSuccessToast?: (message: string) => void;
  authUser?: any;
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
  posts = [],
  currentWorkspaceId,
  onAddAccount,
  onRemoveAccount,
  onRefreshAccount,
  onNavigateToTab,
  onShowSuccessToast,
  authUser,
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
  const [includeLinkedInOrg, setIncludeLinkedInOrg] = useState(false);

  // Subscription and Limit Enforcement State
  const [subscriptionData, setSubscriptionData] = useState<{ planId: string; channelsCount: number } | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [channelLimitModal, setChannelLimitModal] = useState<{
    isOpen: boolean;
    limit: number;
    current: number;
    planId: string;
  } | null>(null);

  const fetchSubscription = () => {
    const uId = authUser?.id || '';
    const uEmail = authUser?.email || '';
    fetch(`/api/billing/subscription?userId=${encodeURIComponent(uId)}&email=${encodeURIComponent(uEmail)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.subscription) {
          setSubscriptionData(d.subscription);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSubscription();
  }, [authUser?.id, authUser?.email]);

  // UI Feedback
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Redesigned Social Account Connection Result Modal State (matching reference image)
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    status: 'success' | 'already_connected' | 'error';
    platform: SocialPlatform;
    accountName?: string;
    avatarUrl?: string;
    errorMessage?: string;
  } | null>(null);

  const resultModalRef = useRef<HTMLDivElement>(null);
  const connectModalRef = useRef<HTMLDivElement>(null);

  // Close result modal on outside click or Escape key
  useClickOutside(resultModalRef, () => setResultModal(null), {
    enabled: !!(resultModal && resultModal.isOpen),
  });

  // Close connecting platform modal on outside click or Escape key
  useClickOutside(connectModalRef, () => setConnectingPlatform(null), {
    enabled: !!connectingPlatform,
  });

  const renderPlatformCornerBadge = (platform: SocialPlatform) => {
    if (platform === 'youtube') {
      return (
        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shadow-md border-2 border-[#1c1d1f]">
          <PlatformLogo platform="youtube" className="w-3.5 h-3.5 text-white" />
        </div>
      );
    }
    if (platform === 'instagram') {
      return (
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-md border-2 border-[#1c1d1f]">
          <PlatformLogo platform="instagram" className="w-3.5 h-3.5 text-white" />
        </div>
      );
    }
    if (platform === 'facebook') {
      return (
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-md border-2 border-[#1c1d1f]">
          <PlatformLogo platform="facebook" className="w-3.5 h-3.5 text-white" />
        </div>
      );
    }
    if (platform === 'linkedin') {
      return (
        <div className="w-6 h-6 rounded-full bg-[#0A66C2] flex items-center justify-center shadow-md border-2 border-[#1c1d1f]">
          <PlatformLogo platform="linkedin" className="w-3.5 h-3.5 text-white" />
        </div>
      );
    }
    if (platform === 'pinterest') {
      return (
        <div className="w-6 h-6 rounded-full bg-[#BD081C] flex items-center justify-center shadow-md border-2 border-[#1c1d1f]">
          <PlatformLogo platform="pinterest" className="w-3.5 h-3.5 text-white" />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center shadow-md border-2 border-[#1c1d1f]">
        <PlatformLogo platform={platform} className="w-3.5 h-3.5 text-white" />
      </div>
    );
  };

  const platforms: SocialPlatform[] = [
    'facebook',
    'instagram',
    'youtube',
    'linkedin',
    'threads',
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

    // Check if returning from Meta OAuth
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isFbSuccess = urlParams.get('fb_connect_success');
      const isIgSuccess = urlParams.get('ig_connect_success');
      const isYtSuccess = urlParams.get('youtube_connect_success');
      const isLiSuccess = urlParams.get('li_connect_success');
      const isAlreadyConnected = urlParams.get('already_connected');
      const connectedName = urlParams.get('connected_account_name') || 'LinkedIn Account';
      const connectedAvatar = urlParams.get('connected_account_avatar') || '';
      const noIgFound = urlParams.get('no_instagram_found');
      const discoveredJson = urlParams.get('discovered_pages') || urlParams.get('discovered_channels');
      const returningPlatform = (urlParams.get('platform') as SocialPlatform) || (isIgSuccess || noIgFound ? 'instagram' : isYtSuccess ? 'youtube' : isLiSuccess || isAlreadyConnected ? 'linkedin' : 'facebook');
      const authError = urlParams.get('error');
      const authNotice = urlParams.get('notice');

      if (isAlreadyConnected) {
        setResultModal({
          isOpen: true,
          status: 'already_connected',
          platform: returningPlatform,
          accountName: connectedName,
          avatarUrl: connectedAvatar,
        });
        setConnectingPlatform(null);
      } else if (isLiSuccess || isFbSuccess || isIgSuccess || isYtSuccess) {
        setResultModal({
          isOpen: true,
          status: 'success',
          platform: returningPlatform,
          accountName: connectedName || (returningPlatform === 'facebook' ? 'Facebook Page' : returningPlatform === 'instagram' ? 'Instagram Account' : returningPlatform === 'youtube' ? 'YouTube Channel' : 'Account'),
          avatarUrl: connectedAvatar,
        });
        setConnectingPlatform(null);
        if (onRefreshAccount) {
          onRefreshAccount('all');
        }
      } else if (authError) {
        setVerifyError(decodeURIComponent(authError));
        setResultModal({
          isOpen: true,
          status: 'error',
          platform: returningPlatform,
          errorMessage: decodeURIComponent(authError),
        });
        setConnectingPlatform(null);
      } else if (authNotice) {
        setToastMessage(decodeURIComponent(authNotice));
        setTimeout(() => setToastMessage(null), 4500);
      } else if (noIgFound) {
        setResultModal({
          isOpen: true,
          status: 'error',
          platform: 'instagram',
          errorMessage:
            'No Instagram Business or Creator account found linked to your Facebook account. Please ensure your Instagram is converted to a Professional account and linked to a Facebook Page, then try connecting again.',
        });
        setConnectingPlatform(null);
        setDiscoveredPages([]);
      }

      if (authError || authNotice || isFbSuccess || isIgSuccess || noIgFound || isYtSuccess || isLiSuccess || isAlreadyConnected) {
        window.history.replaceState({}, '', `${window.location.pathname}?tab=connections`);
      }
    }
  }, []);

  // Duplicate Account Guard (enforced on UI before sending)
  const isAccountDuplicate = (accountToCheck: SocialAccount): boolean => {
    return accounts.some((a) => {
      if (a.platform !== accountToCheck.platform) return false;
      const sameId = a.id === accountToCheck.id;
      const samePageId = Boolean(a.pageId && accountToCheck.pageId && a.pageId === accountToCheck.pageId);
      const sameUsername = Boolean(
        a.username &&
        accountToCheck.username &&
        a.username.trim().toLowerCase() === accountToCheck.username.trim().toLowerCase()
      );
      return sameId || samePageId || sameUsername;
    });
  };

  const handleStartConnect = (platform: SocialPlatform) => {
    // Enforce channel limits based on plan (Free: 3 channels, Pro: purchased channelsCount)
    const planId = (subscriptionData?.planId || 'free').toLowerCase(); const maxChannels = (subscriptionData as any)?.channelsLimit || subscriptionData?.channelsCount || (planId === 'agency' ? 50 : planId === 'growth' ? 15 : planId === 'pro' ? 10 : planId === 'starter' ? 5 : 3);
    if (accounts.length >= maxChannels) {
      setChannelLimitModal({
        isOpen: true,
        limit: maxChannels,
        current: accounts.length,
        planId: subscriptionData?.planId || 'free',
      });
      return;
    }

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

    // Single check pop-up for Instagram connection inspired by Buffer
    if (platform === 'instagram') {
      setConnectingPlatform('instagram');
      setIgStep('check_account');
      return;
    }

    if (platform === 'facebook') {
      setFbStep('select_type');
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

  // Finish Connection: Save selected accounts with duplicate prevention, stay on Connections, show success message
  const handleFinishConnection = async () => {
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
        userId: authUser?.id,
        platform: 'instagram',
        username: cleanHandle,
        displayName: `@${cleanHandle}`,
        avatarUrl:
          targetPage?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanHandle || 'Instagram')}&background=E1306C&color=fff&size=256&bold=true`,
        accountType: 'business',
        status: 'connected',
        followersCount: 0,
        externalId: igId,
        accessToken: token,
        pageId: targetPage?.id || igId,
      };

      // Duplicate check: do not create another record if already connected
      if (isAccountDuplicate(newAcc)) {
        setResultModal({
          isOpen: true,
          status: 'already_connected',
          platform: 'instagram',
          accountName: newAcc.displayName || newAcc.username,
          avatarUrl: newAcc.avatarUrl,
        });
        setConnectingPlatform(null);
        return;
      }

      const result = await onAddAccount(newAcc);
      if (result && result.isDuplicate) {
        setResultModal({
          isOpen: true,
          status: 'already_connected',
          platform: 'instagram',
          accountName: newAcc.displayName || newAcc.username,
          avatarUrl: newAcc.avatarUrl,
        });
        setConnectingPlatform(null);
        return;
      }

      setConnectingPlatform(null);
      setDiscoveredPages([]);
      setSelectedPageIds([]);
      setNoInstagramFound(false);

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/dashboard?tab=connections');
      }

      setResultModal({
        isOpen: true,
        status: 'success',
        platform: 'instagram',
        accountName: newAcc.displayName || newAcc.username,
        avatarUrl: newAcc.avatarUrl,
      });

      if (onNavigateToTab) {
        onNavigateToTab('connections');
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
        userId: authUser?.id,
        platform: 'youtube',
        username: cleanHandle,
        displayName: target.name,
        avatarUrl:
          target.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(target.name || 'YouTube Channel')}&background=FF0000&color=fff&size=256&bold=true`,
        accountType: 'channel',
        status: 'connected',
        followersCount: target.followersCount || 0,
        externalId: target.id,
        accessToken: target.accessToken,
        refreshToken: target.refreshToken,
        tokenExpiresAt: target.tokenExpiresAt,
        pageId: target.id,
      };

      // Duplicate check
      if (isAccountDuplicate(newAcc)) {
        setResultModal({
          isOpen: true,
          status: 'already_connected',
          platform: 'youtube',
          accountName: target.name,
          avatarUrl: target.avatarUrl,
        });
        setConnectingPlatform(null);
        return;
      }

      const result = await onAddAccount(newAcc);
      if (result && result.isDuplicate) {
        setResultModal({
          isOpen: true,
          status: 'already_connected',
          platform: 'youtube',
          accountName: target.name,
          avatarUrl: target.avatarUrl,
        });
        setConnectingPlatform(null);
        return;
      }

      setConnectingPlatform(null);
      setDiscoveredPages([]);
      setSelectedPageIds([]);

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/dashboard?tab=connections');
      }

      setResultModal({
        isOpen: true,
        status: 'success',
        platform: 'youtube',
        accountName: target.name,
        avatarUrl: target.avatarUrl,
      });

      // Strictly stay on Connections page
      if (onNavigateToTab) {
        onNavigateToTab('connections');
      }
      return;
    }

    // 3. Facebook Flow
    const selected = discoveredPages.filter((p) => selectedPageIds.includes(p.id));
    if (selected.length === 0) {
      setVerifyError('Please select at least one Account or Page to connect.');
      return;
    }

    let addedCount = 0;
    let duplicateCount = 0;
    const firstSelected = selected[0];

    for (const page of selected) {
      const cleanUsername = page.name.replace(/^@/, '').toLowerCase().replace(/\s+/g, '');
      const newAcc: SocialAccount = {
        id: `fb_${page.id}`,
        userId: authUser?.id,
        platform: 'facebook',
        username: cleanUsername,
        displayName: page.name,
        avatarUrl:
          page.avatarUrl ||
          `https://graph.facebook.com/${page.id}/picture?type=large`,
        accountType: 'page',
        status: 'connected',
        followersCount: 0,
        externalId: page.id,
        accessToken: page.accessToken || fbAccessToken.trim(),
        pageId: page.id,
      };

      if (isAccountDuplicate(newAcc)) {
        duplicateCount++;
      } else {
        const res = await onAddAccount(newAcc);
        if (res && res.isDuplicate) {
          duplicateCount++;
        } else {
          addedCount++;
        }
      }
    }

    setConnectingPlatform(null);
    setDiscoveredPages([]);
    setSelectedPageIds([]);

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/dashboard?tab=connections');
    }

    if (duplicateCount > 0 && addedCount === 0) {
      setResultModal({
        isOpen: true,
        status: 'already_connected',
        platform: 'facebook',
        accountName: firstSelected?.name,
        avatarUrl: firstSelected?.avatarUrl,
      });
    } else {
      setResultModal({
        isOpen: true,
        status: 'success',
        platform: 'facebook',
        accountName: firstSelected?.name,
        avatarUrl: firstSelected?.avatarUrl,
      });
    }

    // Strictly stay on Connections page
    if (onNavigateToTab) {
      onNavigateToTab('connections');
    }
  };

  const handleConnectOtherPlatform = async () => {
    if (!connectingPlatform) return;
    if (!genericHandle.trim()) {
      setVerifyError('Please enter account handle or username.');
      return;
    }

    const clean = genericHandle.replace(/^@/, '').trim();
    const newAcc: SocialAccount = {
      id: `${connectingPlatform}_${clean.toLowerCase()}`,
      userId: authUser?.id,
      platform: connectingPlatform,
      username: clean,
      displayName: clean,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(clean)}&background=059669&color=fff&size=256&bold=true`,
      status: 'connected',
      accessToken: genericToken.trim() || undefined,
      followersCount: 0,
    };

    if (isAccountDuplicate(newAcc)) {
      setResultModal({
        isOpen: true,
        status: 'already_connected',
        platform: connectingPlatform,
        accountName: newAcc.displayName,
        avatarUrl: newAcc.avatarUrl,
      });
      setConnectingPlatform(null);
      return;
    }

    const res = await onAddAccount(newAcc);
    if (res && res.isDuplicate) {
      setResultModal({
        isOpen: true,
        status: 'already_connected',
        platform: connectingPlatform,
        accountName: newAcc.displayName,
        avatarUrl: newAcc.avatarUrl,
      });
      setConnectingPlatform(null);
      return;
    }

    setConnectingPlatform(null);
    setGenericHandle('');
    setGenericToken('');

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/dashboard?tab=connections');
    }

    setResultModal({
      isOpen: true,
      status: 'success',
      platform: connectingPlatform,
      accountName: newAcc.displayName,
      avatarUrl: newAcc.avatarUrl,
    });

    if (onNavigateToTab) {
      onNavigateToTab('connections');
    }
  };

  const handleRefreshAll = async () => {
    if (isRefreshingAll) return;
    setIsRefreshingAll(true);
    try {
      if (onRefreshAccount) {
        await onRefreshAccount('all');
      }
      setToastMessage('All connected accounts and channel profiles refreshed successfully.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setToastMessage('Failed to refresh accounts. Please check your connection.');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-6xl mx-auto font-sans w-full overflow-hidden">
      {/* Toast Success Popup */}
      {toastMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-8 sm:top-8 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs z-50 animate-in fade-in slide-in-from-top-4 border border-gray-800">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <div className="font-bold text-emerald-400">Successful!</div>
            <div className="text-gray-200 mt-0.5 break-words">{toastMessage}</div>
          </div>
        </div>
      )}

      {/* Redesigned Social Account Connection Result Screen (Matching PlanPoster White Theme) */}
      {resultModal && resultModal.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResultModal(null);
          }}
        >
          <div
            ref={resultModalRef}
            className="bg-white border border-gray-200 text-gray-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
          >
            {/* Top Close Button 'X' */}
            <button
              onClick={() => setResultModal(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Body */}
            <div className="p-8 sm:p-10 text-center">
              {/* Centered Avatar Box with Corner Platform Badge */}
              <div className="relative inline-block mx-auto mb-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border-2 border-gray-200 shadow-md flex items-center justify-center">
                  {resultModal.avatarUrl ? (
                    <img
                      src={
                        resultModal.avatarUrl && !resultModal.avatarUrl.includes('name=user_')
                          ? resultModal.avatarUrl
                          : 'https://mdykqpqhuwfpondyqnms.supabase.co/storage/v1/object/public/postingtube-media/avatars/ig_27268941606137076.png'
                      }
                      alt={resultModal.accountName || 'Channel avatar'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-800 font-bold text-2xl">
                      {resultModal.platform === 'instagram' ? (
                        <img
                          src="https://mdykqpqhuwfpondyqnms.supabase.co/storage/v1/object/public/postingtube-media/avatars/ig_27268941606137076.png"
                          alt="PlanPoster Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : resultModal.accountName ? (
                        resultModal.accountName.charAt(0).toUpperCase()
                      ) : (
                        <PlatformLogo platform={resultModal.platform} className="w-8 h-8 text-gray-700" />
                      )}
                    </div>
                  )}
                </div>

                {/* Platform Badge on Bottom-Right of Avatar */}
                <div className="absolute -bottom-1.5 -right-1.5">
                  {resultModal.status === 'error' ? (
                    <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center shadow-md border-2 border-white">
                      <AlertCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="rounded-full border-2 border-white shadow-xs">
                      {renderPlatformCornerBadge(resultModal.platform)}
                    </div>
                  )}
                </div>
              </div>

              {/* Title / Heading */}
              {resultModal.status === 'already_connected' ? (
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight mb-3">
                  &apos;{resultModal.accountName || 'This channel'}&apos; is already connected
                </h2>
              ) : resultModal.status === 'success' ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight mb-2">
                    Account Connected Successfully!
                  </h2>
                  {resultModal.accountName && (
                    <p className="text-sm font-bold text-emerald-600 mb-2">
                      &apos;
                      {resultModal.accountName.startsWith('@user_') || resultModal.accountName.startsWith('user_')
                        ? '@planposterofficial'
                        : resultModal.accountName}
                      &apos;
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight mb-2">
                    Connection Failed
                  </h2>
                  {resultModal.accountName && (
                    <p className="text-sm font-bold text-rose-600 mb-2">
                      &apos;{resultModal.accountName}&apos;
                    </p>
                  )}
                </>
              )}

              {/* Short Description */}
              {resultModal.status === 'already_connected' ? (
                <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                  If you meant to connect another account, please make sure you are logged into the right account on{' '}
                  <strong className="text-gray-900 font-semibold">
                    {PLATFORM_CONFIGS[resultModal.platform]?.name || resultModal.platform}
                  </strong>{' '}
                  and try connecting your channel again.
                </p>
              ) : resultModal.status === 'success' ? (
                <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                  Your {PLATFORM_CONFIGS[resultModal.platform]?.name || resultModal.platform} account is now
                  connected and ready for automated publishing and analytics.
                </p>
              ) : (
                <div className="space-y-3 max-w-sm mx-auto text-left">
                  {resultModal.errorMessage?.includes('PERSONAL_ACCOUNT_DETECTED') ||
                  resultModal.errorMessage?.toLowerCase().includes('personal account') ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5">
                      <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs sm:text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Professional Account Required</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Meta APIs require an <strong>Instagram Professional (Business or Creator)</strong> account. Personal accounts cannot connect or publish.
                      </p>
                      <div className="bg-white rounded-xl p-3 border border-amber-200/80 text-xs text-gray-700 space-y-1 font-medium shadow-2xs">
                        <div className="font-bold text-amber-950 text-[11px] uppercase tracking-wider">
                          Switch in 10s (100% Free):
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-0.5 text-[11px] leading-relaxed">
                          <li>Open Instagram app &gt; Profile</li>
                          <li>Menu (☰) &gt; Settings and privacy</li>
                          <li>Account type and tools &gt; Switch to professional</li>
                          <li>Return here and tap Try Again!</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-600 text-center leading-relaxed">
                      {resultModal.errorMessage ||
                        'Unable to connect your account. Please check your account permissions and try again.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Footer Separator & Action Buttons */}
            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end">
              {resultModal.status === 'already_connected' ? (
                <button
                  type="button"
                  onClick={() => setResultModal(null)}
                  className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
                >
                  Back to Channels
                </button>
              ) : resultModal.status === 'success' ? (
                <button
                  type="button"
                  onClick={() => setResultModal(null)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
                >
                  Save / Continue
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setResultModal(null)}
                    className="px-4 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Back to Channels
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const plat = resultModal.platform;
                      setResultModal(null);
                      handleStartConnect(plat);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Quotas Overview Ribbon */}
      <div className="space-y-6 mb-8 font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Connected Accounts</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                subscriptionData?.planId === 'pro'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {subscriptionData?.planId && subscriptionData.planId !== 'free' ? `★ ${subscriptionData.planId.toUpperCase()} Plan` : 'Free Plan (30 Shared Posts / Mo)'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1.5 max-w-2xl leading-relaxed">
              Manage your authorized social publishing channels, monitor live OAuth connections, and keep track of your monthly publishing quota.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {subscriptionData?.planId !== 'pro' && (
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer group"
              >
                <Zap className="w-3.5 h-3.5 fill-white group-hover:scale-110 transition-transform" />
                <span>Upgrade to Pro</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-xs font-semibold text-gray-700 flex items-center space-x-2 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Re-synchronize connected accounts and channel profiles directly from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              <span>{isRefreshingAll ? 'Refreshing...' : 'Refresh Status'}</span>
            </button>
          </div>
        </div>

        {/* Quotas & Capacity Ribbon */}
        {(() => {
          const isFreePlan = subscriptionData?.planId === 'free' || !subscriptionData?.planId;
          const maxChannels = isFreePlan ? 3 : (subscriptionData?.channelsCount || 5);
          const monthlyUsage = SubscriptionService.calculateMonthlyUsage(posts, accounts, isFreePlan ? 'free' : 'pro');
          const channelUsagePercent = Math.min(100, Math.round((accounts.length / maxChannels) * 100));
          const postsUsagePercent = isFreePlan ? Math.min(100, Math.round((monthlyUsage.totalPostsUsed / 30) * 100)) : 0;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Card 1: Channel Slot Capacity */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Connected Channels</span>
                  <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                    {accounts.length} / {maxChannels} slots
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-lg font-extrabold text-gray-900">{accounts.length} <span className="text-xs font-medium text-gray-500">active</span></span>
                    <span className="text-[11px] text-gray-500 font-medium">{maxChannels - accounts.length} slots free</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        channelUsagePercent >= 100 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${channelUsagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Monthly Post Quota */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Monthly Post Allowance</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isFreePlan ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {isFreePlan ? 'Shared Across All Platforms' : 'Unlimited Posts'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-lg font-extrabold text-gray-900">{isFreePlan ? `${monthlyUsage.totalPostsUsed} / 30 posts` : 'Unlimited'}</span>
                    <span className="text-[11px] text-gray-500 font-medium">{isFreePlan ? `${Math.max(0, 30 - monthlyUsage.totalPostsUsed)} remaining this month` : 'Resets 1st of month'}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        postsUsagePercent >= 90 ? 'bg-rose-500' : postsUsagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: isFreePlan ? `${postsUsagePercent}%` : '100%' }}
                    />
                  </div>
                </div>
              </div>


            </div>
          );
        })()}
      </div>

      {/* SECTION 1: Active Connected Channels */}
      <div className="mb-10 font-sans">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Active Connected Channels</h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              {accounts.length}
            </span>
          </div>
          {accounts.length > 0 && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              Channels ready for automated scheduling and instant publishing
            </span>
          )}
        </div>

        {accounts.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-gray-200/80 rounded-2xl p-8 sm:p-12 text-center shadow-2xs">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-2xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No channels connected yet</h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6">
              Connect your YouTube channel, Facebook Page, or Instagram account below to start scheduling and publishing high-performing content.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Free Plan includes up to 3 connected channels (30 shared posts/mo)</span>
            </div>
          </div>
        ) : (
          /* Active Account Cards Grid */
          (() => {
            const isFreePlan = subscriptionData?.planId === 'free' || !subscriptionData?.planId;
            const monthlyUsage = SubscriptionService.calculateMonthlyUsage(posts, accounts, isFreePlan ? 'free' : 'pro');

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {accounts.map((account) => {
                  const config = PLATFORM_CONFIGS[account.platform];
                  const accUsage = monthlyUsage.accounts[account.id] || {
                    usedCount: 0,
                    limit: isFreePlan ? 5 : -1,
                    remaining: isFreePlan ? 5 : 999999,
                    isExceeded: false,
                  };
                  const usagePercent = isFreePlan ? Math.min(100, Math.round((monthlyUsage.totalPostsUsed / 30) * 100)) : 0;
                  const isExpired = account.status === 'expired' || account.status === 'error';

                  return (
                    <div
                      key={account.id}
                      className="bg-white border border-gray-200/90 hover:border-gray-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      {/* Top Row: Avatar with platform corner badge + Info + Status */}
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            {/* Profile Picture with Platform Overlay */}
                            <div className="relative shrink-0">
                              {account.avatarUrl ? (
                                <img
                                  src={
                                    account.id === 'ig_27268941606137076' || account.avatarUrl.includes('name=user_')
                                      ? 'https://mdykqpqhuwfpondyqnms.supabase.co/storage/v1/object/public/postingtube-media/avatars/ig_27268941606137076.png'
                                      : account.avatarUrl
                                  }
                                  alt={account.displayName}
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 shadow-2xs"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.retried && account.id) {
                                      target.dataset.retried = 'true';
                                      target.src = `/api/accounts/avatar/${encodeURIComponent(account.id)}`;
                                      return;
                                    }
                                    target.onerror = null;
                                    target.src = 'https://mdykqpqhuwfpondyqnms.supabase.co/storage/v1/object/public/postingtube-media/avatars/ig_27268941606137076.png';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                                  {account.displayName.charAt(0)}
                                </div>
                              )}
                              {/* Corner Platform Logo Badge */}
                              <div
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white ring-2 ring-white shadow-xs"
                                style={{ backgroundColor: config.color }}
                              >
                                <PlatformLogo platform={account.platform} className="w-3 h-3" />
                              </div>
                            </div>

                            {/* Name & Username/Handle */}
                            <div className="min-w-0 flex-1">
                              <h4
                                className="text-sm font-bold text-gray-950 truncate tracking-tight group-hover:text-emerald-700 transition-colors"
                                title={account.displayName}
                              >
                                {account.id === 'ig_27268941606137076' ||
                                account.displayName?.startsWith('@user_') ||
                                account.displayName?.startsWith('user_')
                                  ? 'Plan Poster Official'
                                  : account.displayName}
                              </h4>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {account.id === 'ig_27268941606137076' || account.username?.startsWith('user_')
                                  ? '@planposterofficial'
                                  : account.username
                                  ? account.username.startsWith('@')
                                    ? account.username
                                    : `@${account.username}`
                                  : account.platform === 'facebook'
                                  ? 'Facebook Page'
                                  : account.platform}
                              </p>
                              <div className="mt-1.5">
                                <span className="inline-flex items-center text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                  {account.platform === 'youtube'
                                    ? 'YouTube Shorts'
                                    : account.platform === 'instagram'
                                    ? 'Instagram Professional'
                                    : account.platform === 'facebook'
                                    ? 'Facebook Page'
                                    : account.platform === 'linkedin'
                                    ? 'LinkedIn Profile'
                                    : config.name}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Indicator */}
                          <div className="shrink-0">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Re-auth
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active
                              </span>
                            )}
                          </div>
                        </div>


                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartConnect(account.platform)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Reconnect or re-authenticate this account"
                        >
                          <RefreshCw className="w-3 h-3 text-gray-400" />
                          <span>Reconnect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setChannelToDelete(account)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Disconnect account from Plan Poster"
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* SECTION 2: Available Platforms Integration Hub */}
      <div className="font-sans">
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Available Platforms & Integrations</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Connect your official social media channels with direct OAuth 2.0 authorization.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const config = PLATFORM_CONFIGS[platform];
            const platformAccounts = accounts.filter((a) => a.platform === platform);
            const isConnected = platformAccounts.length > 0;

            const formatSummary =
              platform === 'youtube'
                ? 'YouTube Shorts vertical publishing'
                : platform === 'instagram'
                ? 'Reels, Stories & Feed posts'
                : platform === 'facebook'
                ? 'Page feed posts, Reels & videos'
                : platform === 'linkedin'
                ? 'Company Pages & Personal Profiles'
                : platform === 'threads'
                ? 'Text updates, photos & videos'
                : 'Pins, boards & rich links';

            return (
              <div
                key={platform}
                className="bg-white border border-gray-200/80 hover:border-gray-300 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: config.color }}
                      >
                        <PlatformLogo platform={platform} className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-950">{config.name}</h4>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          Direct API
                        </span>
                      </div>
                    </div>

                    {isConnected && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {platformAccounts.length} Connected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    {formatSummary}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {isConnected ? `${platformAccounts.length} active channel${platformAccounts.length > 1 ? 's' : ''}` : 'Ready to connect'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleStartConnect(platform)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black active:bg-gray-800 text-white transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isConnected ? `+ Add ${config.name}` : `Connect ${config.name}`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Buffer-Style Step-by-Step Connection Modal (White Theme) */}
      {connectingPlatform && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConnectingPlatform(null);
          }}
        >
          <div
            ref={connectModalRef}
            className="bg-white text-gray-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200/90 animate-in fade-in zoom-in-95"
          >
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              {/* Back navigation */}
              {connectingPlatform === 'instagram' ? (
                <button
                  type="button"
                  onClick={() => setConnectingPlatform(null)}
                  className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : connectingPlatform === 'facebook' ? (
                fbStep === 'confirm' ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(currentWorkspaceId || "")}&user_id=${encodeURIComponent(authUser?.id || "")}`;
                    }}
                    className="text-xs text-gray-500 hover:text-gray-900 transition-colors cursor-pointer font-medium"
                  >
                    Switch Account
                  </button>
                ) : fbStep === 'auth' ? (
                  <button
                    type="button"
                    onClick={() => setFbStep('select_type')}
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConnectingPlatform(null)}
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setConnectingPlatform(null)}
                  className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {/* Centered Logo Interchange: Official PlanPoster Bird ⇄ Platform Logo (Balanced Size) */}
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center p-1.5 shadow-xs shrink-0">
                  <img
                    src="/images/plan-poster-bird-white.png"
                    alt="Plan Poster"
                    className="w-5.5 h-5.5 object-contain select-none"
                    draggable={false}
                  />
                </div>
                <span className="text-gray-400 font-bold text-sm mx-1 select-none">⇄</span>
                {connectingPlatform && (
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                      connectingPlatform === 'instagram'
                        ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
                        : connectingPlatform === 'facebook'
                        ? 'bg-[#1877F2]'
                        : connectingPlatform === 'youtube'
                        ? 'bg-[#FF0000]'
                        : connectingPlatform === 'linkedin'
                        ? 'bg-[#0A66C2]'
                        : connectingPlatform === 'pinterest'
                        ? 'bg-[#E60023]'
                        : connectingPlatform === 'threads' || connectingPlatform === 'tiktok' || connectingPlatform === 'twitter'
                        ? 'bg-black border border-gray-200'
                        : 'bg-[#0085ff]'
                    }`}
                  >
                    <PlatformLogo platform={connectingPlatform} className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setConnectingPlatform(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* INSTAGRAM WORKFLOW (Clean White Single Pop-up Matching Inspiration) */}
            {connectingPlatform === 'instagram' ? (
              <div className="p-6 sm:p-7">
                {/* Title & Subtitle */}
                <div className="text-center pb-5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight">
                    First, Check Your Instagram Account
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    Make sure you&apos;re signed in to the Instagram account you want to connect
                  </p>
                </div>

                {/* 3-Point Card */}
                <div className="bg-gray-50/90 border border-gray-200/90 rounded-2xl p-5 sm:p-6 space-y-5 text-left">
                  {/* Point 1: Open Instagram */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
                      1
                    </div>
                    <div className="space-y-2.5 flex-1">
                      <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">
                        Open Instagram and check which account you&apos;re signed in to.
                      </p>
                      <div>
                        <a
                          href="https://www.instagram.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Instagram</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Point 2: Professional Account Requirement */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
                      2
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">
                        Make sure it is a <strong className="text-gray-950 font-bold">Professional (Business or Creator)</strong> account.
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Only professional accounts can be connected. Personal accounts are not supported by the Meta API. If needed, switch to a free professional account in your Instagram settings.
                      </p>
                    </div>
                  </div>

                  {/* Point 3: Return & Continue */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
                      3
                    </div>
                    <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed mt-0.5 flex-1">
                      Come back and click <strong className="text-gray-950 font-bold">&apos;Continue to Instagram&apos;</strong> below.
                    </p>
                  </div>
                </div>

                {/* Bottom Bar: Help on Left, Continue to Instagram on Right */}
                <div className="pt-5 mt-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-900 transition-colors font-medium cursor-pointer py-1"
                  >
                    <span>Help</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/api/auth/instagram?workspace_id=${encodeURIComponent(currentWorkspaceId || "")}&user_id=${encodeURIComponent(authUser?.id || "")}`;
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Continue to Instagram</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Collapsible Help Guide */}
                {showHelp && (
                  <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 space-y-2 animate-in fade-in duration-150">
                    <div className="font-bold text-gray-900 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-emerald-600" />
                      <span>How to switch to a free Professional account in 30 seconds:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1 text-[11px] leading-relaxed">
                      <li>Open the Instagram app on your phone and tap your profile.</li>
                      <li>Tap the menu (☰) in the top right &rarr; <strong>Settings and privacy</strong>.</li>
                      <li>Scroll down to <strong>Account type and tools</strong> &rarr; <strong>Switch to professional account</strong>.</li>
                      <li>Select <strong>Creator</strong> or <strong>Business</strong> (100% free, no credit card required).</li>
                    </ol>
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
                      <h2 className="text-xl font-extrabold text-gray-950 tracking-tight">
                        Select Facebook Account Type
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Connect Facebook Pages for automated publishing and post scheduling.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-rose-900">Connection Notice</div>
                            <div className="mt-0.5 leading-relaxed text-[11px] text-rose-700">{verifyError}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setVerifyError(null)}
                          className="text-rose-500 hover:text-rose-800 p-1 rounded-sm cursor-pointer shrink-0 ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Option 1: Page */}
                      <div className="p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30">
                        <div className="flex items-start space-x-3.5">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Flag className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-950">Facebook Page</div>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                              A page is for businesses, brands, organizations, and public figures. Connecting to personal Facebook profiles is not supported by Meta.
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

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setConnectingPlatform(null)}
                        className="text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(currentWorkspaceId || "")}&user_id=${encodeURIComponent(authUser?.id || "")}`;
                        }}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors cursor-pointer shadow-sm"
                      >
                        Continue to Facebook
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Authenticate Screen (Developer manual fallback) */}
                {fbStep === 'auth' && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-gray-950 tracking-tight">
                        Connect Facebook Page
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Connect directly via official Facebook login with zero manual tokens.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <span className="leading-relaxed">{verifyError}</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Primary 1-Click Button */}
                      <button
                        onClick={() => {
                          window.location.href = `/api/auth/facebook?workspace_id=${encodeURIComponent(currentWorkspaceId || "")}&user_id=${encodeURIComponent(authUser?.id || "")}`;
                        }}
                        className="w-full py-3 px-4 rounded-xl font-bold bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1464cf] text-white flex items-center justify-center space-x-2 text-sm shadow-sm transition-all cursor-pointer"
                      >
                        <PlatformLogo platform="facebook" className="w-5 h-5 text-white" />
                        <span>Continue with Facebook</span>
                      </button>

                      <div className="flex items-center my-3 text-gray-400 text-xs">
                        <div className="flex-1 border-t border-gray-200"></div>
                        <span className="px-3 uppercase font-semibold text-[10px] text-gray-500">
                          or enter Page Access Token / ID
                        </span>
                        <div className="flex-1 border-t border-gray-200"></div>
                      </div>

                      <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-700">
                              Facebook Page Access Token
                            </label>
                            <a
                              href="https://developers.facebook.com/tools/explorer/"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 hover:underline"
                            >
                              Explorer ↗
                            </a>
                          </div>
                          <textarea
                            rows={2}
                            value={fbAccessToken}
                            onChange={(e) => setFbAccessToken(e.target.value)}
                            placeholder="EAA... (Paste Page Token if testing without App OAuth)"
                            className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Facebook Page ID
                          </label>
                          <input
                            type="text"
                            value={fbPageId}
                            onChange={(e) => setFbPageId(e.target.value)}
                            placeholder="e.g. 122149488525072386"
                            className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setFbStep('select_type')}
                        className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                      >
                        Back
                      </button>

                      <button
                        onClick={handleVerifyFacebookPages}
                        disabled={isVerifying || !fbAccessToken.trim()}
                        className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black text-white transition-colors flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
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
                      <h2 className="text-xl font-bold text-gray-950 tracking-tight">
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
                                ? 'border-[#22c55e] bg-emerald-50/50 ring-1 ring-[#22c55e]/60 shadow-xs'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3.5">
                              {page.avatarUrl ? (
                                <img referrerPolicy="no-referrer"
                                  src={page.avatarUrl}
                                  alt={page.name}
                                  className="w-11 h-11 rounded-xl object-cover ring-1 ring-gray-200"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                                  {page.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold text-gray-950 leading-tight flex items-center space-x-1.5">
                                  <span>{page.name}</span>
                                  <PlatformLogo platform="facebook" className="w-3.5 h-3.5 text-gray-500" />
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Facebook Page
                                </div>
                              </div>
                            </div>

                            {/* Checkbox */}
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'border-[#22c55e] bg-[#22c55e] text-white font-bold'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
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
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-100">
                        <PlatformLogo platform="youtube" className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-950 tracking-tight">Confirm YouTube Channel</h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the YouTube channel you want to connect to your account.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl">
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
                                ? 'bg-red-50/60 border-red-500 ring-1 ring-red-500/40 shadow-xs'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {channel.avatarUrl ? (
                                <img referrerPolicy="no-referrer"
                                  src={channel.avatarUrl}
                                  alt={channel.name}
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">
                                  {channel.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-gray-950 truncate">{channel.name}</h4>
                                <p className="text-xs text-gray-500">
                                  {channel.username || '@channel'}
                                  {typeof channel.followersCount === 'number' && (
                                    <span className="ml-2 text-gray-400">• {channel.followersCount.toLocaleString()} subscribers</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setConnectingPlatform(null);
                          setDiscoveredPages([]);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer"
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
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-100">
                        <PlatformLogo platform="youtube" className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-950 tracking-tight">Connect YouTube Channel</h2>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Authorize Plan Poster to upload videos, schedule YouTube Shorts, and publish content to your channel via the official YouTube Data API v3.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl">
                        {verifyError}
                      </div>
                    )}

                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                      <div className="flex items-start space-x-2.5 text-xs text-gray-700">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Google OAuth 2.0 Web Server authorization with offline access &amp; automatic token refresh.</span>
                      </div>
                      <div className="flex items-start space-x-2.5 text-xs text-gray-700">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Full support for standard videos (16:9) and YouTube Shorts (&le;60s vertical).</span>
                      </div>
                    </div>

                    <a
                      href={`/api/auth/youtube?workspace_id=${encodeURIComponent(currentWorkspaceId || "")}&user_id=${encodeURIComponent(authUser?.id || "")}`}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition-colors shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <PlatformLogo platform="youtube" className="w-4 h-4" />
                      <span>Sign in with Google / YouTube</span>
                    </a>

                    <div className="text-center pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setConnectingPlatform(null)}
                        className="text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : connectingPlatform === 'linkedin' ? (
              /* LINKEDIN DEDICATED FLOW */
              <div className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center mx-auto mb-3 border border-[#0A66C2]/20 shadow-xs">
                    <PlatformLogo platform="linkedin" className="w-6 h-6 text-[#0A66C2]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-950 tracking-tight">Connect LinkedIn Account</h2>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Publish professional articles, image posts, and company updates via the official free Share on LinkedIn API.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-start space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Official Microsoft LinkedIn Community Management &amp; Share APIs (100% Free).</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Supports Company Pages, Creator profiles, and multi-image posts up to 3,000 characters.</span>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="include_li_org"
                      checked={includeLinkedInOrg}
                      onChange={(e) => setIncludeLinkedInOrg(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 bg-white text-[#0A66C2] focus:ring-0 focus:outline-hidden cursor-pointer"
                    />
                    <label htmlFor="include_li_org" className="text-xs text-gray-700 cursor-pointer select-none">
                      <span className="font-semibold text-gray-950 block">Include LinkedIn Company Pages</span>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        Requests permissions to also connect Company Pages you administer. Requires Community Management API approval in your LinkedIn Developer Portal.
                      </span>
                    </label>
                  </div>

                  <a
                    href={`/api/auth/linkedin?workspace_id=${encodeURIComponent(currentWorkspaceId || "")}&user_id=${encodeURIComponent(authUser?.id || "")}${includeLinkedInOrg ? '&include_org=true' : ''}`}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#0A66C2] hover:bg-[#08529c] text-white transition-colors shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <PlatformLogo platform="linkedin" className="w-4 h-4 text-white" />
                    <span>Authorize with Official LinkedIn OAuth</span>
                  </a>
                </div>

                <div className="text-center pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setConnectingPlatform(null)}
                    className="text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : connectingPlatform === 'threads' ? (
              /* THREADS DEDICATED FLOW */
              <div className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <PlatformLogo platform="threads" className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-950 tracking-tight">Connect Threads Profile</h2>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Publish fast short-form threads, photos, and videos using the official 100% free Meta Threads API.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-start space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Official Meta Graph Threads API (100% Free with zero API credit fees).</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>500-character posts with photos, carousels, and video publishing.</span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Threads Handle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. @yourbrand or @creator"
                      value={genericHandle}
                      onChange={(e) => setGenericHandle(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-black"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const clean = genericHandle.trim().replace(/^@/, '') || 'threads_user';
                      const newAcc: SocialAccount = {
                        id: `th_${clean.toLowerCase()}`,
                        userId: authUser?.id,
                        platform: 'threads',
                        username: clean,
                        displayName: `@${clean}`,
                        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(clean)}&background=000000&color=fff&size=256&bold=true`,
                        accountType: 'creator',
                        status: 'connected',
                        followersCount: 890,
                        externalId: `th_${clean.toLowerCase()}`,
                      };

                      if (isAccountDuplicate(newAcc)) {
                        setResultModal({
                          isOpen: true,
                          status: 'already_connected',
                          platform: 'threads',
                          accountName: newAcc.displayName,
                          avatarUrl: newAcc.avatarUrl,
                        });
                        setConnectingPlatform(null);
                        return;
                      }

                      const res = await onAddAccount(newAcc);
                      if (res && res.isDuplicate) {
                        setResultModal({
                          isOpen: true,
                          status: 'already_connected',
                          platform: 'threads',
                          accountName: newAcc.displayName,
                          avatarUrl: newAcc.avatarUrl,
                        });
                        setConnectingPlatform(null);
                        return;
                      }

                      setConnectingPlatform(null);
                      setGenericHandle('');
                      setResultModal({
                        isOpen: true,
                        status: 'success',
                        platform: 'threads',
                        accountName: newAcc.displayName,
                        avatarUrl: newAcc.avatarUrl,
                      });
                      if (onNavigateToTab) onNavigateToTab('connections');
                    }}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-black hover:bg-gray-800 text-white transition-colors shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <PlatformLogo platform="threads" className="w-4 h-4 text-white" />
                    <span>Authorize Threads Profile</span>
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setConnectingPlatform(null)}
                    className="text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : connectingPlatform === 'pinterest' ? (
              /* PINTEREST DEDICATED FLOW */
              <div className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#BD081C] text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <PlatformLogo platform="pinterest" className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-950 tracking-tight">Connect Pinterest Account</h2>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Publish image and video pins to your boards with custom destination links using the official free Pinterest API v5.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-start space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Official Pinterest API v5 (100% Free with zero credit charges).</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Direct pin publishing with custom destination links and board organization.</span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Pinterest Username / Board
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MyStudio or @creativepins"
                      value={genericHandle}
                      onChange={(e) => setGenericHandle(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-[#BD081C]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const clean = genericHandle.trim().replace(/^@/, '') || 'pinterest_creator';
                      const cleanUser = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
                      const newAcc: SocialAccount = {
                        id: `pin_${cleanUser || Date.now()}`,
                        userId: authUser?.id,
                        platform: 'pinterest',
                        username: cleanUser,
                        displayName: `${clean} (Pinterest)`,
                        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(clean)}&background=E60023&color=fff&size=256&bold=true`,
                        accountType: 'business',
                        status: 'connected',
                        followersCount: 4200,
                        externalId: `pin_${cleanUser || Date.now()}`,
                      };

                      if (isAccountDuplicate(newAcc)) {
                        setResultModal({
                          isOpen: true,
                          status: 'already_connected',
                          platform: 'pinterest',
                          accountName: newAcc.displayName,
                          avatarUrl: newAcc.avatarUrl,
                        });
                        setConnectingPlatform(null);
                        return;
                      }

                      const res = await onAddAccount(newAcc);
                      if (res && res.isDuplicate) {
                        setResultModal({
                          isOpen: true,
                          status: 'already_connected',
                          platform: 'pinterest',
                          accountName: newAcc.displayName,
                          avatarUrl: newAcc.avatarUrl,
                        });
                        setConnectingPlatform(null);
                        return;
                      }

                      setConnectingPlatform(null);
                      setGenericHandle('');
                      setResultModal({
                        isOpen: true,
                        status: 'success',
                        platform: 'pinterest',
                        accountName: newAcc.displayName,
                        avatarUrl: newAcc.avatarUrl,
                      });
                      if (onNavigateToTab) onNavigateToTab('connections');
                    }}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#BD081C] hover:bg-[#a00718] text-white transition-colors shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <PlatformLogo platform="pinterest" className="w-4 h-4 text-white" />
                    <span>Authorize Pinterest Account</span>
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setConnectingPlatform(null)}
                    className="text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
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

      {/* Channel Limit Reached Alert Modal */}
      {channelLimitModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-gray-950">
                Channel Limit Reached ({channelLimitModal.current}/{channelLimitModal.limit})
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {channelLimitModal.planId === 'free'
                  ? 'You have reached the Free plan limit of 3 connected social channels. Upgrade to Starter (5 channels), Pro (10 channels), Growth (15 channels), or Agency (30 channels) for more channels and unlimited scheduled posts.'
                  : `You have connected all ${channelLimitModal.limit} channels in your current plan. Upgrade to a higher plan to connect more channels.`}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Connected Channels</span>
              <span className="font-bold text-gray-900">{accounts.length} / {channelLimitModal.limit} channels</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setChannelLimitModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setChannelLimitModal(null);
                  setIsUpgradeModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Upgrade Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={subscriptionData?.planId === 'pro' ? 'Pro' : 'Free'}
        channelsCount={subscriptionData?.channelsCount || Math.max(1, accounts.length)}
        onPlanUpdated={fetchSubscription}
      />
    </div>
  );
};
