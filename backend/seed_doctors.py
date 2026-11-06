"""Seed demo doctors + a demo patient into the configured MongoDB.

Usage (from backend/):  python seed_doctors.py
Password for every demo account = DEMO_PASSWORD from .env (never hard-coded in production).
"""
import asyncio

from app.db.database import Database
from app.seed import DEMO_PATIENT_EMAIL, DOCTORS, seed_demo


async def main() -> None:
    await Database.connect()
    await seed_demo()
    print("Demo accounts ready:")
    print(f"  patient: {DEMO_PATIENT_EMAIL}")
    for d in DOCTORS:
        print(f"  doctor:  {d[2]} ({d[3]})")
    print("  password: value of DEMO_PASSWORD in backend/.env")
    await Database.close()


if __name__ == "__main__":
    asyncio.run(main())
