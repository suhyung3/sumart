const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS stocks (
    stock_code TEXT PRIMARY KEY,
    stock_name TEXT NOT NULL,
    category TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS fundamentals (
    stock_code TEXT PRIMARY KEY,
    stock_name TEXT,
    current_price INTEGER,
    market_cap REAL,
    rev_26e REAL, rev_27e REAL, rev_yoy_26 REAL, rev_yoy_27 REAL,
    op_26e REAL, op_27e REAL, op_yoy_26 REAL, op_yoy_27 REAL,
    ni_26e REAL, ni_27e REAL, ni_yoy_26 REAL, ni_yoy_27 REAL,
    eps_26e REAL, eps_27e REAL,
    opm_26e REAL, opm_27e REAL,
    fwd_per REAL, fwd_pbr REAL, peg REAL, roe REAL,
    eps_rev_1m REAL, eps_rev_3m REAL,
    fetched_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS valuation_band (
    stock_code TEXT,
    year INTEGER,
    price_high INTEGER,
    price_low INTEGER,
    per_high REAL,
    per_low REAL,
    pbr_high REAL,
    pbr_low REAL,
    PRIMARY KEY (stock_code, year)
  );
`);

// 태그 테이블 — 종목에 사용자 정의 태그 부여
db.exec(`
  CREATE TABLE IF NOT EXISTS stock_tags (
    stock_code TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (stock_code, tag),
    FOREIGN KEY (stock_code) REFERENCES stocks(stock_code) ON DELETE CASCADE
  );
`);

// 마이그레이션
try { db.exec("ALTER TABLE stocks ADD COLUMN category TEXT DEFAULT ''"); } catch (e) { /* already exists */ }
try { db.exec("ALTER TABLE fundamentals ADD COLUMN per_27e REAL"); } catch (e) { /* already exists */ }
try { db.exec("ALTER TABLE fundamentals ADD COLUMN cons_target_cons INTEGER"); } catch (e) { /* already exists */ }
try { db.exec("ALTER TABLE fundamentals ADD COLUMN cons_target_opt INTEGER"); } catch (e) { /* already exists */ }
try { db.exec("ALTER TABLE fundamentals ADD COLUMN eps_trend TEXT"); } catch (e) { /* already exists */ }

module.exports = db;
