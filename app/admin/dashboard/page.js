'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const router = useRouter();

  async function fetchData(p = page) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/visitors?page=${p}`);
      if (res.status === 401) {
        router.push('/admin');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [page]);

  async function handleDelete(id) {
    if (!confirm('Delete this record?')) return;
    await fetch(`/api/admin/visitors?id=${id}`, { method: 'DELETE' });
    fetchData();
  }

  async function handleClearAll() {
    if (!confirm('Delete ALL visitor records? This cannot be undone.')) return;
    await fetch('/api/admin/visitors?clear=all', { method: 'DELETE' });
    setPage(1);
    fetchData(1);
  }

  async function handleLogout() {
    // Clear cookie by setting empty value
    document.cookie = 'admin_session=; path=/; max-age=0';
    router.push('/admin');
  }

  // Get CSV export data
  async function handleExport() {
    const res = await fetch('/api/admin/visitors?page=1&export=csv');
    if (res.status === 401) { router.push('/admin'); return; }
    const json = await res.json();
    // Build CSV
    const headers = ['ID', 'IP', 'Country', 'Region', 'City', 'ISP', 'Lat', 'Lon', 'User Agent', 'Referer', 'Visited At'];
    const rows = [headers];
    json.visitors.data.forEach(v => {
      rows.push([v.id, v.ip_address, v.country, v.region, v.city, v.isp, v.latitude, v.longitude, v.user_agent, v.referer, v.visited_at]);
    });
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitors_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ff6b6b' }}>
        <h2>Error loading dashboard</h2>
        <p>{error}</p>
        <button onClick={() => fetchData()} className="btn-primary" style={{ marginTop: '16px' }}>
          Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats;
  const visitors = data?.visitors?.data || [];
  const totalPages = data?.visitors ? Math.ceil(data.visitors.total / data.visitors.perPage) : 0;
  const totalRecords = data?.visitors?.total || 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      {/* Top Bar */}
      <div style={{
        background: 'rgba(20, 20, 40, 0.95)',
        borderBottom: '1px solid rgba(100, 100, 255, 0.1)',
        padding: '16px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <h1 style={{ fontSize: '1.3rem' }} className="gradient-text">
          🛡️ IP Logger · Admin
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: '#8888aa' }}>
          <span>👤 Admin</span>
          <button
            onClick={handleLogout}
            style={{
              color: '#ff6b6b',
              background: 'none',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: '8px',
              padding: '6px 16px',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '16px', padding: '20px 30px', flexWrap: 'wrap' }}>
          <StatCard num={stats.total.toLocaleString()} label="Total Visitors" />
          <StatCard num={stats.today.toLocaleString()} label="Today" />
          <StatCard num={stats.uniqueIps.toLocaleString()} label="Unique IPs" />
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '0 30px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => fetchData()}
          style={{
            background: 'rgba(0, 210, 255, 0.1)',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            color: '#00d2ff',
            padding: '8px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          ⟳ Refresh
        </button>
        <button onClick={handleExport} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
          ⬇ Export CSV
        </button>
        <button onClick={handleClearAll} className="btn-danger">
          🗑 Clear All
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: '0 30px 20px', overflowX: 'auto' }}>
        {visitors.length > 0 ? (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'rgba(20, 20, 40, 0.6)',
            borderRadius: '14px',
            overflow: 'hidden',
            border: '1px solid rgba(100, 100, 255, 0.08)',
            fontSize: '0.85rem',
          }}>
            <thead>
              <tr style={{ background: 'rgba(30, 30, 60, 0.8)' }}>
                {['ID', 'IP Address', 'Location', 'ISP', 'Coordinates', 'User Agent', 'Visited At', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: '#6666aa',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visitors.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid rgba(100, 100, 255, 0.05)' }}>
                  <td style={{ padding: '11px 14px', color: '#8888aa' }}>{v.id}</td>
                  <td style={{
                    padding: '11px 14px',
                    fontFamily: "'Courier New', monospace",
                    color: '#00d2ff',
                    fontWeight: 600,
                  }}>
                    {v.ip_address}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {v.country && (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        background: 'rgba(58, 123, 213, 0.15)',
                        color: '#88bbff',
                        marginRight: '4px',
                      }}>
                        {v.country}
                      </span>
                    )}
                    {v.city ? `${v.city}, ` : ''}{v.region || ''}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '0.8rem', color: '#aaaacc' }}>
                    {v.isp || '—'}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '0.75rem', color: '#8888aa' }}>
                    {v.latitude && v.longitude ? `${v.latitude}, ${v.longitude}` : '—'}
                  </td>
                  <td style={{
                    padding: '11px 14px',
                    fontSize: '0.75rem',
                    color: '#8888aa',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={v.user_agent}>
                    {(v.user_agent || '').substring(0, 50)}{(v.user_agent || '').length > 50 ? '...' : ''}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '0.78rem', color: '#8888aa', whiteSpace: 'nowrap' }}>
                    {new Date(v.visited_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <button
                      onClick={() => handleDelete(v.id)}
                      style={{
                        color: '#ff6b6b',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555577' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>📭 No visitors yet</h3>
            <p>Visit the main page to generate logs.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          padding: '16px 30px 30px',
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          flexWrap: 'wrap',
        }}>
          {page > 1 && (
            <button
              onClick={() => setPage(page - 1)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#8888aa',
                border: '1px solid rgba(100, 100, 255, 0.1)',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              ‹ Prev
            </button>
          )}
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            let p;
            if (totalPages <= 10) {
              p = i + 1;
            } else if (page <= 5) {
              p = i + 1;
            } else if (page >= totalPages - 4) {
              p = totalPages - 9 + i;
            } else {
              p = page - 5 + i;
            }
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: page === p ? '#00d2ff' : '#8888aa',
                  border: page === p
                    ? '1px solid rgba(0, 210, 255, 0.3)'
                    : '1px solid rgba(100, 100, 255, 0.1)',
                  background: page === p ? 'rgba(0, 210, 255,
