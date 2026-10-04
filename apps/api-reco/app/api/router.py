from fastapi import APIRouter

from app.api import admin, events, onboarding, products, recommendations, reference, routines, users

api_router = APIRouter(prefix="/api/v1")
for module in (onboarding, users, products, recommendations, routines, events, reference, admin):
    api_router.include_router(module.router)
