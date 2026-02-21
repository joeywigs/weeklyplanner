'use client';

import { useState } from 'react';
import {
  getWorkerUrl,
  getHouseholdId,
  testConnection,
  pushAllToCloud,
} from '@/lib/cloud';

export function CloudSettings() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  async function handleTest() {
    setStatus('testing');
    const ok = await testConnection();
    setStatus(ok ? 'ok' : 'error');
  }

  async function handlePush() {
    setSyncStatus('Pushing...');
    try {
      await pushAllToCloud();
      setSyncStatus('All data pushed to cloud.');
    } catch {
      setSyncStatus('Push failed.');
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <h2 className="text-sm font-bold text-gray-900 mb-1">Cloud Sync</h2>
      <p className="text-xs text-gray-500 mb-3">
        Syncing to <span className="font-mono">{getWorkerUrl()}</span> as{' '}
        <span className="font-mono">{getHouseholdId()}</span>.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleTest}
          disabled={status === 'testing'}
          className="text-xs px-3 py-1.5 rounded-md bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 transition-colors"
        >
          {status === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handlePush}
          className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
        >
          Push All to Cloud
        </button>
      </div>

      {status === 'ok' && (
        <p className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1.5 rounded-md">
          Connected to cloud.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-md">
          Could not connect. Check that the worker is deployed.
        </p>
      )}
      {syncStatus && (
        <p className="mt-2 text-xs text-accent-600 bg-accent-50 px-2 py-1.5 rounded-md">
          {syncStatus}
        </p>
      )}
    </div>
  );
}
