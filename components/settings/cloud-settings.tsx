'use client';

import { useState, useEffect } from 'react';
import {
  getWorkerUrl,
  setWorkerUrl,
  getHouseholdId,
  setHouseholdId,
  isCloudEnabled,
  testConnection,
  pushAllToCloud,
} from '@/lib/cloud';

export function CloudSettings() {
  const [url, setUrl] = useState('');
  const [household, setHousehold] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    setUrl(getWorkerUrl());
    setHousehold(getHouseholdId());
  }, []);

  function handleSave() {
    setWorkerUrl(url.trim());
    setHouseholdId(household.trim());
    setStatus('idle');
    setSyncStatus(null);
  }

  async function handleTest() {
    handleSave();
    if (!url.trim() || !household.trim()) {
      setStatus('error');
      return;
    }
    setStatus('testing');
    const ok = await testConnection();
    setStatus(ok ? 'ok' : 'error');
  }

  async function handlePush() {
    if (!isCloudEnabled()) return;
    setSyncStatus('Pushing...');
    try {
      await pushAllToCloud();
      setSyncStatus('All data pushed to cloud.');
    } catch {
      setSyncStatus('Push failed.');
    }
  }

  const connected = isCloudEnabled();

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <h2 className="text-sm font-bold text-gray-900 mb-1">Cloud Sync</h2>
      <p className="text-xs text-gray-500 mb-3">
        Sync your planner across devices using a Cloudflare Worker.
      </p>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">
            Worker URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://planner-api.your-account.workers.dev"
            className="mt-0.5 w-full text-xs px-2 py-1.5 rounded-md bg-gray-50 border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">
            Household ID
          </label>
          <input
            type="text"
            value={household}
            onChange={(e) => setHousehold(e.target.value)}
            placeholder="wiggins-family"
            className="mt-0.5 w-full text-xs px-2 py-1.5 rounded-md bg-gray-50 border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">
            Letters, numbers, hyphens, dots. Everyone using this ID shares the same planner.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={handleTest}
          disabled={status === 'testing'}
          className="text-xs px-3 py-1.5 rounded-md bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 transition-colors"
        >
          {status === 'testing' ? 'Testing...' : 'Save & Test'}
        </button>
        {connected && (
          <button
            onClick={handlePush}
            className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            Push All to Cloud
          </button>
        )}
      </div>

      {status === 'ok' && (
        <p className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1.5 rounded-md">
          Connected to cloud.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-md">
          Could not connect. Check the URL and household ID.
        </p>
      )}
      {syncStatus && (
        <p className="mt-2 text-xs text-accent-600 bg-accent-50 px-2 py-1.5 rounded-md">
          {syncStatus}
        </p>
      )}

      {!connected && (
        <div className="mt-3 text-[10px] text-gray-400 space-y-0.5">
          <p>Cloud sync is disabled. Data is stored locally only.</p>
          <p>
            To enable, deploy the worker from{' '}
            <span className="font-mono">worker/</span> and enter the URL above.
          </p>
        </div>
      )}
    </div>
  );
}
