import os
from pathlib import Path

import aiosqlite


ROOT_DIR = Path(__file__).resolve().parents[2]
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(ROOT_DIR / "data" / "homelab.db")))


async def connect() -> aiosqlite.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    database = await aiosqlite.connect(DATABASE_PATH)
    database.row_factory = aiosqlite.Row
    await database.execute("PRAGMA foreign_keys = ON")
    await database.execute("PRAGMA journal_mode = WAL")
    return database


async def initialize_database() -> None:
    database = await connect()
    try:
        await database.executescript(
            """
            CREATE TABLE IF NOT EXISTS maintenance_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                host_id TEXT NOT NULL,
                service_id TEXT,
                action TEXT NOT NULL,
                user TEXT NOT NULL,
                result TEXT NOT NULL,
                details TEXT,
                source TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_history_host_time
                ON maintenance_history(host_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_history_service_time
                ON maintenance_history(service_id, timestamp DESC);
            CREATE TABLE IF NOT EXISTS host_status (
                host_id TEXT PRIMARY KEY,
                checked_at TEXT NOT NULL,
                status_json TEXT NOT NULL
            );
            """
        )
        await database.commit()
    finally:
        await database.close()
