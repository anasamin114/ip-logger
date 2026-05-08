// app/api/log-visit/route.js
import { NextResponse } from 'next/server';
import { logVisitor } from '@/lib/db';

export async function GET(request) {
  try {
    // ─── Get IP address ─────────────────────────────────────────────
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');
    const vercelIp = request.headers.get('x-vercel-forwarded-for');

    const ip = forwardedFor?.split(',')[0]?.trim()
      || realIp
      || cfIp
      || vercelIp
      || request.headers.get('x-real-ip-detected')
      || '127.0.0.1';

    // ─── Get geolocation from Vercel headers first (fastest) ────────
    let country = request.headers.get('x-vercel-ip-country') || null;
    let region = request.headers.get('x-vercel-ip-country-region') || null;
    let city = request.headers.get('x-vercel-ip-city') || null;
    let lat = request.headers.get('x-vercel-ip-latitude') || null;
    let lon = request.headers.get('x-vercel-ip-longitude') || null;
    let isp = null;

    // ─── If Vercel didn't provide geo data, use ip-api.com ──────────
    if (!country || !city) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const geoRes = await fetch(
          `http://ip-api.com/json/${ip}?fields=country,regionName,city,isp,lat,lon,status`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.status === 'success') {
            country = country || geo.country || null;
            region = region || geo.regionName || null;
            city = city || geo.city || null;
            isp = geo.isp || null;
            lat = lat || geo.lat?.toString() || null;
            lon = lon || geo.lon?.toString() || null;
          }
        }
      } catch {
        // Geolocation fetch failed — proceed with whatever we have
      }
    }

    // ─── User-Agent & Referer ───────────────────────────────────────
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    // ─── Log to database ────────────────────────────────────────────
    const visitorData = {
      ip_address: ip,
      country,
      region,
      city,
      isp,
      latitude: lat,
      longitude: lon,
      user_agent: userAgent,
      referer,
      page_visited: '/',
    };

    // Fire and forget — don't block the response
    logVisitor(visitorData).catch(err => {
      console.error('Failed to log visitor:', err.message);
    });

    // ─── Return data to the visitor ─────────────────────────────────
    return NextResponse.json({
      ip,
      country,
      region,
      city,
      isp,
      lat,
      lon,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
