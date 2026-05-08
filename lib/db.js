// lib/db.js
// Automatically uses Supabase in production (Vercel) or SQLite locally

let db = null;

if (typeof window === 'undefined') {
  // Server-side only
  const isVercel = process.env.VERCEL === '1';

  if (isVercel) {
    // ─── Supabase (Production / Vercel) ────────────────────────────
    const { createClient } = require('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    db = createClient(supabaseUrl, supabaseKey);

    // Initialize tables
    db.rpc('init_tables').catch(async () => {
      // Tables might not exist yet — create via raw SQL
      await db.query(`
        CREATE TABLE IF NOT EXISTS visitors (
          id BIGSERIAL PRIMARY KEY,
          ip_address TEXT NOT NULL,
          country TEXT,
          region TEXT,
          city TEXT,
          isp TEXT,
          latitude TEXT,
          longitude TEXT,
          user_agent TEXT,
          referer TEXT,
          page_visited TEXT,
          visited_at TIMESTAMPTZ DEFAULT NOW()
        );
      `).catch(() => {});

      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `).catch(() => {});

      // Create default admin if not exists
      const { data: existing } = await db
        .from('users')
        .select('id')
        .eq('username', 'Admin')
        .maybeSingle();

      if (!existing) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('12345678', 10);
        await db.from('users').insert({ username: 'Admin', password_hash: hash });
      }
    });
  } else {
    // ─── SQLite (Local Development) ─────────────────────────────────
    const Database = require('better-sqlite3');
    const path = require('path');
    const bcrypt = require('bcryptjs');

    const dbPath = path.join(process.cwd(), 'data', 'ip-logger.db');

    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        country TEXT,
        region TEXT,
        city TEXT,
        isp TEXT,
        latitude TEXT,
        longitude TEXT,
        user_agent TEXT,
        referer TEXT,
        page_visited TEXT,
        visited_at DATETIME DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now'))
      );
    `);

    // Create default admin if not exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('Admin');
    if (!existing) {
      const hash = bcrypt.hashSync('12345678', 10);
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('Admin', hash);
      console.log('✅ Default admin user created (Admin / 12345678)');
    }
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────

export async function logVisitor(data) {
  if (db.constructor?.name === 'SupabaseClient') {
    const { error } = await db.from('visitors').insert([data]);
    if (error) throw error;
    return true;
  } else {
    const stmt = db.prepare(`
      INSERT INTO visitors (ip_address, country, region, city, isp, latitude, longitude, user_agent, referer, page_visited)
      VALUES (@ip_address, @country, @region, @city, @isp, @latitude, @longitude, @user_agent, @referer, @page_visited)
    `);
    return stmt.run(data);
  }
}

export async function getVisitors(page = 1, perPage = 20) {
  const offset = (page - 1) * perPage;

  if (db.constructor?.name === 'SupabaseClient') {
    const { data, error, count } = await db
      .from('visitors')
      .select('*', { count: 'exact' })
      .order('visited_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) throw error;
    return { data, total: count, page, perPage };
  } else {
    const total = db.prepare('SELECT COUNT(*) as count FROM visitors').get().count;
    const data = db.prepare(
      'SELECT * FROM visitors ORDER BY visited_at DESC LIMIT ? OFFSET ?'
    ).all(perPage, offset);
    return { data, total, page, perPage };
  }
}

export async function getVisitorStats() {
  if (db.constructor?.name === 'SupabaseClient') {
    const { data: total } = await db.from('visitors').select('id', { count: 'exact', head: true });
    const { data: today } = await db
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .gte('visited_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    
    const { data: uniqueIps } = await db
      .from('visitors')
      .select('ip_address', { count: 'exact', head: true, distinct: true });

    return {
      total: total?.length ?? 0,
      today: today?.length ?? 0,
      uniqueIps: uniqueIps?.length ?? 0,
    };
  } else {
    const total = db.prepare('SELECT COUNT(*) as count FROM visitors').get().count;
    const today = db.prepare(
      "SELECT COUNT(*) as count FROM visitors WHERE date(visited_at) = date('now')"
    ).get().count;
    const uniqueIps = db.prepare(
      'SELECT COUNT(DISTINCT ip_address) as count FROM visitors'
    ).get().count;
    return { total, today, uniqueIps };
  }
}

export async function deleteVisitor(id) {
  if (db.constructor?.name === 'SupabaseClient') {
    const { error } = await db.from('visitors').delete().eq('id', id);
    if (error) throw error;
  } else {
    db.prepare('DELETE FROM visitors WHERE id = ?').run(id);
  }
  return true;
}

export async function clearAllVisitors() {
  if (db.constructor?.name === 'SupabaseClient') {
    const { error } = await db.from('visitors').delete().neq('id', 0);
    if (error) throw error;
  } else {
    db.prepare('DELETE FROM visitors').run();
  }
  return true;
}

export async function authenticateUser(username, password) {
  const bcrypt = require('bcryptjs');

  if (db.constructor?.name === 'SupabaseClient') {
    const { data: user } = await db
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? { id: user.id, username: user.username } : null;
  } else {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return null;
    const valid = bcrypt.compareSync(password, user.password_hash);
    return valid ? { id: user.id, username: user.username } : null;
  }
}

export default db;
