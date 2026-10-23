'use client';

import React, { useState, useMemo } from 'react';
import { Post, SocialAccount } from '@/types/social';
import { executePostPublish, PublishExecutionSummary } from '@/lib/publisher';
import { PlatformLogo } from './SocialIcons';
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  Zap,
  Send,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  ExternalLink,
  Layers,
  Sparkles,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { parseDateSafe, formatTimeSafe, formatDateFullSafe } from '@/lib/dateUtils';

interface BackgroundWorkerSimulatorProps {
  posts: Post[];
  accounts: SocialAccount[];
  onPostUpdated: (updatedPost: Post) => void;
}

interface WorkerLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export const BackgroundWorkerSimulator: React.FC<BackgroundWorkerSimulatorProps> = ({
  posts,
  accounts,
  onPostUpdated,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'failed' | 'logs'>('queue');
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error' | 'info'>('all');
  const [isCopied, setIsCopied] = useState(false);

  const [logs, setLogs] = useState<WorkerLog[]>([]);

  // Derived post queues
  const scheduledPosts = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'scheduled')
        .sort((a, b) => {
          const tA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
          const tB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
          return tA - tB;
        }),
    [posts]
  );

  const duePosts = useMemo(
    () =>
      scheduledPosts.filter((p) => {
        if (!p.scheduledFor) return false;
        const d = parseDateSafe(p.scheduledFor);
        return d ? isPast(d) : false;
      }),
    [scheduledPosts]
  );

  const failedPosts = useMemo(() => posts.filter((p) => p.status === 'failed'), [posts]);
  const publishedPosts = useMemo(() => posts.filter((p) => p.status === 'published'), [posts]);

  // Helper to append logs
  const addLog = (type: WorkerLog['type'], message: string) => {
    setLogs((prev) => [
      {
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: format(new Date(), 'HH:mm:ss'),
        type,
        message,
      },
      ...prev.slice(0, 100),
    ]);
  };

  // Dispatch a single post immediately
  const handleDispatchSinglePost = async (post: Post) => {
    setIsRunning(true);
    addLog('info', `[DISPATCH] Processing single post #${post.id}...`);

    try {
      const summary: PublishExecutionSummary = await executePostPublish(post, accounts);

      const updatedPost: Post = {
        ...post,
        status: summary.overallStatus,
        publishedAt: summary.overallStatus === 'published' ? new Date().toISOString() : undefined,
        results: summary.results,
      };

      onPostUpdated(updatedPost);

      if (summary.overallStatus === 'published') {
        addLog(
          'success',
          `[SUCCESS] Post #${post.id} published successfully across ${summary.publishedCount} channels.`
        );
      } else {
        addLog(
          'error',
          `[FAILED] Post #${post.id} publication encountered errors across ${summary.failedCount} channels.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown execution failure';
      addLog('error', `[EXCEPTION] Failed to dispatch post #${post.id}: ${msg}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Safe Cron Cycle: only dispatches posts that are currently DUE
  const runDuePostsCycle = async () => {
    setIsRunning(true);
    addLog('info', `[CRON TICK] Starting evaluation cycle at ${format(new Date(), 'PPpp')}...`);

    const postsToProcess = duePosts.length > 0 ? duePosts : scheduledPosts.slice(0, 1);

    if (postsToProcess.length === 0) {
      addLog('info', 'No scheduled posts due for publication in this window.');
      setIsRunning(false);
      return;
    }

    addLog(
      'info',
      `Found ${postsToProcess.length} post(s) ready for dispatch. Starting batch processor...`
    );

    for (const post of postsToProcess) {
      await handleDispatchSinglePost(post);
    }

    addLog('info', '[CRON TICK] Cycle completed. Queue states refreshed.');
    setIsRunning(false);
  };

  // Trigger the actual cloud server cron endpoint (/api/cron/publish)
  const triggerServerCronApi = async () => {
    setIsRunning(true);
    addLog('info', '[CLOUD CRON] Calling GET /api/cron/publish server endpoint...');
    try {
      const res = await fetch('/api/cron/publish');
      const data = await res.json();
      if (data.success) {
        addLog(
          'success',
          `[CLOUD CRON] Server cron executed: ${data.publishedCount} published, ${data.failedCount} failed.`
        );
        if (data.logs && Array.isArray(data.logs)) {
          data.logs.forEach((l: string) => addLog('info', `[SERVER] ${l}`));
        }
      } else {
        addLog('error', `[CLOUD CRON] Server cron returned error: ${data.error || 'Unknown error'}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to call /api/cron/publish';
      addLog('error', `[CLOUD CRON] Network error: ${msg}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Copy logs to clipboard
  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter((l) => l.type === logFilter);
  }, [logs, logFilter]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-emerald-600" />
            <span>Publishing Engine & Background Queue</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Durable job scheduler, active dispatch pipeline, and real-time execution logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cloud Cron API Button */}
          <button
            onClick={triggerServerCronApi}
            disabled={isRunning}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Calls /api/cron/publish cloud endpoint"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Test Server Cron</span>
          </button>

          {/* Run Due Posts Button */}
          <button
            onClick={runDuePostsCycle}
            disabled={isRunning}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Processing...' : 'Run Due Posts Now'}</span>
          </button>
        </div>
      </div>

      {/* Queue Stats Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Scheduled Queue */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Scheduled Queue</div>
          <div className="text-2xl font-extrabold text-sky-600 mt-1">{scheduledPosts.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Awaiting publish window</div>
        </div>

        {/* Due Right Now */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Due Right Now</div>
          <div className={`text-2xl font-extrabold mt-1 ${duePosts.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {duePosts.length}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {duePosts.length > 0 ? 'Ready for immediate dispatch' : 'No overdue jobs'}
          </div>
        </div>

        {/* Published Total */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Published Total</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{publishedPosts.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Dispatched to external APIs</div>
        </div>

        {/* Dead-Letter / Failed */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dead-Letter / Failed</div>
          <div className={`text-2xl font-extrabold mt-1 ${failedPosts.length > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
            {failedPosts.length}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {failedPosts.length > 0 ? 'Eligible for manual retry' : 'Zero pipeline errors'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Scheduled Queue | Failed Queue | Live Logs) */}
      <div className="border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'queue'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled Queue</span>
            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-600">
              {scheduledPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('failed')}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'failed'
                ? 'border-rose-600 text-rose-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Failed / Retry</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                failedPosts.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {failedPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer border-b-2 ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Live Console Logs</span>
            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-600">
              {logs.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: SCHEDULED QUEUE LIST */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-800">Queue is Clear</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                There are no upcoming scheduled posts awaiting dispatch in the queue.
              </p>
            </div>
          ) : (
            scheduledPosts.map((post) => {
              const postAccounts = accounts.filter((a) => post.targetAccountIds.includes(a.id));
              const isDue = post.scheduledFor && parseDateSafe(post.scheduledFor) && isPast(parseDateSafe(post.scheduledFor)!);
              const relativeTime = post.scheduledFor ? formatDistanceToNow(new Date(post.scheduledFor), { addSuffix: true }) : '';

              return (
                <div
                  key={post.id}
                  className={`p-4 rounded-2xl border bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-gray-300 ${
                    isDue ? 'border-amber-300 bg-amber-50/20' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    {/* Media thumbnail */}
                    {post.media && post.media.length > 0 && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
                        {post.media[0].type === 'video' ? (
                          <video src={post.media[0].url} className="w-full h-full object-cover" />
                        ) : (
                          <img
                            src={post.media[0].thumbnailUrl || post.media[0].url}
                            alt="Media preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Target channels */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {postAccounts.map((acc) => (
                          <span
                            key={acc.id}
                            className="inline-flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 text-[11px] font-medium text-gray-700"
                          >
                            <PlatformLogo platform={acc.platform} className="w-3 h-3" />
                            <span>{acc.displayName || acc.username}</span>
                          </span>
                        ))}
                      </div>

                      {/* Caption */}
                      <p className="text-xs text-gray-800 line-clamp-1 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Timing info */}
                      <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="font-semibold text-gray-700">
                          {formatDateFullSafe(post.scheduledFor)} at {formatTimeSafe(post.scheduledFor)}
                        </span>
                        <span>•</span>
                        <span className={isDue ? 'text-amber-600 font-bold' : 'text-gray-500'}>
                          {isDue ? 'Due for dispatch now!' : `Scheduled ${relativeTime}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center space-x-2 self-end md:self-auto shrink-0">
                    <button
                      onClick={() => handleDispatchSinglePost(post)}
                      disabled={isRunning}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>Dispatch Now</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: FAILED / DEAD-LETTER QUEUE */}
      {activeTab === 'failed' && (
        <div className="space-y-3">
          {failedPosts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-800">No Failed Jobs</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                All external dispatches have executed cleanly with zero dead-letter failures.
              </p>
            </div>
          ) : (
            failedPosts.map((post) => {
              const postAccounts = accounts.filter((a) => post.targetAccountIds.includes(a.id));

              return (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-rose-900">
                          Dispatch Failure on Post #{post.id}
                        </div>
                        <p className="text-xs text-gray-700 line-clamp-1 mt-0.5">
                          {post.content}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDispatchSinglePost(post)}
                      disabled={isRunning}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer self-end md:self-auto disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry Dispatch</span>
                    </button>
                  </div>

                  {/* Platform Error Breakdown */}
                  {post.results && (
                    <div className="bg-white p-3 rounded-xl border border-rose-100 text-xs text-rose-800 space-y-1">
                      {Object.entries(post.results).map(([accId, res]) => {
                        const acc = accounts.find((a) => a.id === accId);
                        return (
                          <div key={accId} className="flex items-start space-x-2">
                            <span className="font-semibold text-rose-900">
                              • {acc?.displayName || accId}:
                            </span>
                            <span className="text-rose-700 font-mono text-[11px]">
                              {res.errorMessage || (res.status === 'success' ? 'Published' : 'Failed')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: LIVE TERMINAL LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-gray-950 text-gray-200 rounded-2xl border border-gray-800 overflow-hidden shadow-lg font-mono">
          {/* Terminal Top Bar */}
          <div className="px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-gray-300">scheduler.worker.log</span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Filter Pills */}
              <div className="flex items-center bg-gray-800 rounded-lg p-0.5 text-[11px]">
                {(['all', 'success', 'error', 'info'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={`px-2 py-0.5 rounded capitalize transition-colors ${
                      logFilter === lvl ? 'bg-gray-700 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Copy Logs */}
              <button
                onClick={handleCopyLogs}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200 transition-colors"
                title="Copy logs"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Clear Logs */}
              <button
                onClick={() => setLogs([])}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-rose-400 transition-colors"
                title="Clear logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div className="p-4 h-80 overflow-y-auto space-y-1.5 text-xs text-left scrollbar-thin">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-600 text-center py-10">No log entries matching filter.</div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`shrink-0 uppercase text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      log.type === 'success'
                        ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/40'
                        : log.type === 'error'
                        ? 'text-rose-400 bg-rose-950/80 border border-rose-800/40'
                        : 'text-sky-400 bg-sky-950/80 border border-sky-800/40'
                    }`}
                  >
                    {log.type}
                  </span>
                  <span className="text-gray-300 break-words flex-1 leading-relaxed">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
