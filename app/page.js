'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [data, setData] = useState({
    ip: 'Loading...',
    country: '—',
    region: '—',
    city: '—',
    isp: '—',
    lat: null,
    lon: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Step 1: Get IP from our API (which includes Vercel geolocation)
        const ipRes = await fetch('/api/log-visit');
        const ipData = await ipRes.json();

        if (ipData.error) throw new Error(ipData.error);

        setData({
          ip: ipData.ip,
          country: ipData.country || '—',
          region: ipData.region || '—',
          city: ipData.city || '—',
          isp: ipData.isp || '—',
          lat: ipData.lat,
          lon: ipData.lon,
          loading: false,
          error: null,
        });
      } catch (err) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: err.message,
          ip: 'Error',
        }));
      }
    }

    fetchData();
  }, []);

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
    }}>
      <div className="glass-card" style={{
        padding: '40px',
        width: '100%',
        maxWidth: '540px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(0, 210, 255, 0.15)',
          color: '#00d2ff',
          padding: '4px 14px',
          borderRadius: '20px',
          fontSize: '0.7rem',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginBottom: '16px',
          border: '1px solid rgba(0, 210, 255, 0.2)',
        }}>
          🔍 Public Information
        </div>

        <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '8px' }}>
          Your IP Address
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#8888aa', marginBottom: '28px' }}>
          Detected from your connection
        </p>

        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          border: '1px solid rgba(100, 100, 255, 0.1)',
        }}>
          <div style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            color: '#6a6a9a',
            marginBottom: '8px',
          }}>
            Your Public IP
          </div>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            fontFamily: "'Courier New', monospace",
            color: data.loading ? '#6666aa' : '#ffffff',
            wordBreak: 'break-all',
            animation: data.loading ? 'pulse 1.2s ease-in-out infinite' : 'none',
          }}>
            {data.ip}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginTop: '20px',
          textAlign: 'left',
        }}>
          <GeoItem label="Country" value={data.country} loading={data.loading} />
          <GeoItem label="Region" value={data.region} loading={data.loading} />
          <GeoItem label="City" value={data.city} loading={data.loading} />
          <GeoItem label="ISP" value={data.isp} loading={data.loading} />
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              <div style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#6666aa',
              }}>
                Coordinates
              </div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 500,
                marginTop: '2px',
                color: data.loading ? '#555588' : '#ccccee',
                animation: data.loading ? 'pulse 1.2s ease-in-out infinite' : 'none',
              }}>
                {data.loading ? '—' : data.lat && data.lon ? (
                  <>
                    {data.lat}, {data.lon}
                    <br />
                    <a
                      href={`https://www.google.com/maps?q=${data.lat},${data.lon}`}
                      target="_blank"
                      style={{
                        color: '#3a7bd5',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        display: 'inline-block',
                        marginTop: '4px',
                      }}
                    >
                      🌍 View on Google Maps
                    </a>
                  </>
                ) : '—'}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          fontSize: '0.75rem',
          color: '#555577',
        }}>
          Your information has been logged for security monitoring purposes.
        </div>
      </div>
    </main>
  );
}

function GeoItem({ label, value, loading }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.04)',
      borderRadius: '12px',
      padding: '12px 16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    }}>
      <div style={{
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: '#6666aa',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1rem',
        fontWeight: 500,
        marginTop: '2px',
        color: loading ? '#555588' : '#ccccee',
        animation: loading ? 'pulse 1.2s ease-in-out infinite' : 'none',
      }}>
        {loading ? '—' : value}
      </div>
    </div>
  );
}
