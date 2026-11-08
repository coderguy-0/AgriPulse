import React, { useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';

/**
 * Explains which storage the workspace is using.
 *
 * Static-only hosts (Vercel, Netlify, GitHub Pages) cannot run the Express API, so `/api/*` is
 * answered by the host's SPA fallback. Instead of a bare "request failed with status 404", the app
 * says plainly that the workspace is running from this browser and offers to re-check the API.
 */
export const DataModeBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { dataMode, apiReachable, retryApiConnection } = useAgriPulse();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (dataMode !== 'standalone') return null;

  const handleRetry = async () => {
    setChecking(true);
    setResult(null);
    try {
      const ok = await retryApiConnection();
      setResult(ok
        ? 'The AGRIPULSE API is reachable again. Your hosted workspace has been reloaded.'
        : 'The AGRIPULSE API is still not reachable from this address. Standalone mode continues.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      role="status"
      className={`standalone-banner ${compact ? 'standalone-banner--compact' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        margin: compact ? '0' : '12px 16px 0',
        padding: compact ? '10px 12px' : '12px 14px',
        borderRadius: 14,
        border: '1px solid #d9c48a',
        background: '#fdf8e7',
        color: '#4a3a10',
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <CloudOff size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>
          {apiReachable ? 'Server detected — reload to switch' : 'Standalone mode · this browser is the workspace'}
        </p>
        <p style={{ margin: '2px 0 0' }}>
          The AGRIPULSE API is not reachable from this address, so accounts, farms and device records are
          stored only in this browser and nothing is uploaded. Demo accounts work with the one-click
          launchers; registered devices stay unpaired with no telemetry. Run <code>node server.mjs</code>{' '}
          (or the Render blueprint) for the full API-backed workspace.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid #c9b273',
            background: '#fffdf4',
            fontWeight: 700,
            cursor: checking ? 'progress' : 'pointer',
          }}
        >
          <RefreshCw size={12} aria-hidden="true" className={checking ? 'animate-spin' : undefined} />
          {checking ? 'Checking the API…' : 'Re-check the API connection'}
        </button>
        {result && <p style={{ margin: '6px 0 0', fontWeight: 600 }}>{result}</p>}
      </div>
    </div>
  );
};
