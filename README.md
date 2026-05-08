# IP Logger · Next.js + Vercel

A full-featured IP address logging and geolocation website with admin panel.

## Features

- **Visitor Page** — Shows IP, country, region, city, ISP, GPS coordinates with Google Maps link
- **Automatic Logging** — Every visitor's IP + geolocation + user-agent + referer is stored
- **Admin Panel** — Login at `/admin` (Admin / 12345678)
- **Dashboard** — Stats, paginated table, delete, clear all, CSV export
- **Works Everywhere** — SQLite locally, Supabase on Vercel

## Quick Start (Local)

```bash
npm install
npm run dev
