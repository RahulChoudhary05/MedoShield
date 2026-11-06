"""MongoDB connection management.

Connects with the URL from the environment only. In development/test, if Atlas
is unreachable (or no URL is configured) the API falls back to an in-memory
Mongo (mongomock-motor) so the whole product still runs end-to-end.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.core.config import settings

log = logging.getLogger("medoshield.db")


class Database:
    client = None
    db: Optional[AsyncIOMotorDatabase] = None
    in_memory: bool = False

    @classmethod
    async def connect(cls) -> None:
        if settings.MONGODB_URL:
            for attempt in range(1, 4):
                try:
                    client = cls._new_client()
                    await client.admin.command("ping")
                    cls.client, cls.db, cls.in_memory = client, client[settings.MONGODB_DB], False
                    log.info("Connected to MongoDB (db=%s)", settings.MONGODB_DB)
                    await cls.ensure_indexes()
                    return
                except Exception as exc:  # pragma: no cover - network dependent
                    log.warning("MongoDB connection attempt %d failed: %s", attempt, type(exc).__name__)
                    await asyncio.sleep(min(2 * attempt, 5))

        if not settings.ALLOW_INMEMORY_DB:
            raise RuntimeError("MongoDB unavailable and in-memory fallback is disabled")

        from mongomock_motor import AsyncMongoMockClient

        cls.client = AsyncMongoMockClient(tz_aware=True)
        cls.db = cls.client[settings.MONGODB_DB]
        cls.in_memory = True
        log.warning("Running with an IN-MEMORY database - data resets when the server restarts")
        await cls.ensure_indexes()

    # ── Keep-alive ───────────────────────────────────────────────────────
    _heartbeat_task: Optional[asyncio.Task] = None
    healthy: bool = True
    last_ping_at = None
    reconnects: int = 0

    @classmethod
    def _new_client(cls):
        return AsyncIOMotorClient(
            settings.MONGODB_URL, serverSelectionTimeoutMS=8000, connectTimeoutMS=8000, socketTimeoutMS=30000,
            retryWrites=True, retryReads=True, maxPoolSize=50, minPoolSize=1, maxIdleTimeMS=10 * 60 * 1000,
            heartbeatFrequencyMS=20000, tz_aware=True, appname="medoshield-api",
        )

    @classmethod
    async def ping(cls) -> bool:
        """Ping + a tiny upsert so Atlas always records real activity on the cluster."""
        from datetime import datetime, timezone

        try:
            await cls.get().command("ping")
            if not cls.in_memory:
                await cls.get()["_heartbeat"].update_one(
                    {"_id": "api"}, {"$set": {"at": datetime.now(timezone.utc)}, "$inc": {"beats": 1}}, upsert=True)
            cls.healthy, cls.last_ping_at = True, datetime.now(timezone.utc)
            return True
        except Exception as exc:
            cls.healthy = False
            log.warning("MongoDB heartbeat failed: %s", type(exc).__name__)
            return False

    @classmethod
    async def reconnect(cls) -> bool:
        if cls.in_memory or not settings.MONGODB_URL:
            return False
        try:
            client = cls._new_client()
            await client.admin.command("ping")
        except Exception as exc:
            log.warning("MongoDB reconnect failed: %s", type(exc).__name__)
            return False
        old, cls.client, cls.db = cls.client, client, client[settings.MONGODB_DB]
        cls.reconnects += 1
        try:
            old.close()
        except Exception:
            pass
        log.info("MongoDB reconnected (attempt #%d)", cls.reconnects)
        return True

    @classmethod
    async def _heartbeat_loop(cls) -> None:
        while True:
            await asyncio.sleep(max(30, settings.DB_HEARTBEAT_SECONDS))
            if not await cls.ping():
                await cls.reconnect()

    @classmethod
    def start_heartbeat(cls) -> None:
        if cls._heartbeat_task is None and not cls.in_memory and settings.DB_HEARTBEAT_SECONDS > 0:
            cls._heartbeat_task = asyncio.create_task(cls._heartbeat_loop())

    @classmethod
    async def stop_heartbeat(cls) -> None:
        if cls._heartbeat_task is not None:
            cls._heartbeat_task.cancel()
            try:
                await cls._heartbeat_task
            except (asyncio.CancelledError, Exception):
                pass
            cls._heartbeat_task = None

    @classmethod
    def get(cls) -> AsyncIOMotorDatabase:
        if cls.db is None:
            raise RuntimeError("Database not initialised")
        return cls.db

    @classmethod
    async def close(cls) -> None:
        if cls.client is not None:
            try:
                cls.client.close()
            except Exception:
                pass
        cls.client = cls.db = None

    @classmethod
    async def ensure_indexes(cls) -> None:
        db = cls.get()
        specs = {
            "patients": [IndexModel([("email", ASCENDING)], unique=True), IndexModel([("user_id", ASCENDING)], unique=True)],
            "doctors": [IndexModel([("email", ASCENDING)], unique=True)],
            "auth_sessions": [
                IndexModel([("token_hash", ASCENDING)], unique=True),
                IndexModel([("family", ASCENDING)]),
                IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
            ],
            "login_attempts": [IndexModel([("key", ASCENDING)], unique=True), IndexModel([("updated_at", ASCENDING)], expireAfterSeconds=86400)],
            "analysis_sessions": [IndexModel([("patient_id", ASCENDING), ("created_at", DESCENDING)])],
            "baselines": [IndexModel([("patient_id", ASCENDING)], unique=True)],
            "risk_assessments": [IndexModel([("patient_id", ASCENDING), ("created_at", DESCENDING)]), IndexModel([("session_id", ASCENDING)])],
            "patient_doctor_assignments": [IndexModel([("patient_id", ASCENDING), ("doctor_id", ASCENDING), ("is_active", ASCENDING)])],
            "appointment_requests": [IndexModel([("doctor_id", ASCENDING), ("created_at", DESCENDING)]), IndexModel([("patient_id", ASCENDING)])],
            "chat_messages": [IndexModel([("patient_id", ASCENDING), ("doctor_id", ASCENDING), ("created_at", ASCENDING)])],
            "notifications": [IndexModel([("patient_id", ASCENDING), ("created_at", DESCENDING)])],
            "doctor_notifications": [IndexModel([("doctor_id", ASCENDING), ("created_at", DESCENDING)])],
            "assistant_conversations": [IndexModel([("patient_id", ASCENDING), ("updated_at", DESCENDING)])],
            "video_analyses": [IndexModel([("patient_id", ASCENDING), ("created_at", DESCENDING)])],
            "fitness_records": [IndexModel([("patient_id", ASCENDING), ("date", DESCENDING)])],
            "medication_reminders": [IndexModel([("patient_id", ASCENDING), ("is_active", ASCENDING)])],
            "medication_logs": [IndexModel([("patient_id", ASCENDING), ("taken_at", DESCENDING)])],
            "audit_log": [IndexModel([("actor_id", ASCENDING), ("created_at", DESCENDING)])],
            "security_events": [IndexModel([("created_at", DESCENDING)])],
        }
        for coll, indexes in specs.items():
            try:
                await db[coll].create_indexes(indexes)
            except Exception as exc:
                # Legacy data may contain duplicates; never block startup on an index.
                log.warning("Index creation on %s skipped: %s", coll, exc)


def get_db() -> AsyncIOMotorDatabase:
    return Database.get()
