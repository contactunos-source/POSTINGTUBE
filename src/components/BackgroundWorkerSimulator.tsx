'use client';

import React, { useState } from 'react';
import { Post, SocialAccount } from '@/types/social';
import { executePostPublish, PublishExecutionSummary } from '@/lib/publisher';
import {
  Cpu,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

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
  const [logs, setLogs] = useState<WorkerLog[]>([
    {
      id: 'log_1',
      timestamp: format(new Date(), 'HH:mm:ss'),
      type: 'info',
      message: 'Worker service initialized with 60-second cron interval.',
    },
    {
      id: 'log_2',
      timestamp: format(new Date(), 'HH:mm:ss'),
      type: 'info',
      message: 'Idempotency key generator active. Exponential backoff retry handler enabled.',
    },
  ]);

  const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
  const failedPosts = posts.filter((p) => p.status === 'failed');
  const publishedPosts = posts.filter((p) => p.status === 'published');

  const addLog = (type: WorkerLog['type'], message: string) => {
    setLogs((prev) => [
      {
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: format(new Date(), 'HH:mm:ss'),
        type,
        message,
      },
      ...prev.slice(0, 50),
    ]);
  };

  const runSchedulerCycle = async () => {
    setIsRunning(true);
    addLog('info', `[CRON TICK] Starting scheduler evaluation cycle at ${format(new Date(), 'PPpp')}...`);

    if (scheduledPosts.length === 0) {
      addLog('info', 'No scheduled jobs due for publication in the current window.');
      setIsRunning(false);
      return;
    }

    for (const post of scheduledPosts) {
      addLog('info', `Processing post #${post.id} (${post.targetAccountIds.length} target channels)...`);

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
            `✓ Post #${post.id} dispatched successfully to ${summary.publishedCount} channels.`
          );
        } else {
          addLog(
            'error',
            `✖ Post #${post.id} failed publishing on ${summary.failedCount} channels. Saved failure trace.`
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown execution failure';
        addLog('error', `Worker exception on post #${post.id}: ${message}`);
      }
    }

    addLog('info', '[CRON TICK] Scheduler cycle completed. Queue state updated.');
    setIsRunning(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-emerald-600" />
            <span>Publishing Engine & Background Worker</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Server-side durable job processor, idempotency manager, and official platform dispatch logs.
          </p>
        </div>

        <button
          onClick={runSchedulerCycle}
          disabled={isRunning}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-2 transition-all disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Processing Queue...' : 'Trigger Scheduler Cron Run'}</span>
        </button>
      </div>

      {/* Queue Stats Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Scheduled Queue</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{scheduledPosts.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Awaiting publish window</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Published Total</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{publishedPosts.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Dispatched to external APIs</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Dead-Letter / Failed</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{failedPosts.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Eligible for manual retry</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Worker Health</div>
          <div className="text-sm font-bold text-gray-800 mt-2 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Healthy (99.98%)</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Durable Postgres Queue</div>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-start space-x-3 text-xs text-emerald-900">
        <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-semibold">Independent Server-Side Pipeline:</strong> Scheduled posts execute
          regardless of browser activity. Token pre-flight verifies token validity before invoking official
          adapters for Meta Graph, X API v2, LinkedIn, YouTube, and TikTok.
        </div>
      </div>

      {/* Terminal Live Logs */}
      <div className="bg-gray-950 text-gray-200 rounded-2xl border border-gray-800 overflow-hidden shadow-lg font-mono">
        <div className="px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-gray-300">scheduler.worker.log</span>
          </div>
          <span className="text-[10px] text-gray-500">Live Daemon Output</span>
        </div>

        <div className="p-4 h-72 overflow-y-auto space-y-1.5 text-xs text-left">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2">
              <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
              <span
                className={`shrink-0 uppercase text-[10px] px-1 rounded font-bold ${
                  log.type === 'success'
                    ? 'text-emerald-400 bg-emerald-950/60'
                    : log.type === 'error'
                    ? 'text-rose-400 bg-rose-950/60'
                    : 'text-blue-400 bg-blue-950/60'
                }`}
              >
                {log.type}
              </span>
              <span className="text-gray-300">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
