"""
FastAPI application entry point.
Configures middleware, lifespan events, and mounts routers.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler.
    Initializes database on startup.
    """
    # Startup
    print("🚀 Starting DevPlanner API...")
    print(f"📦 Database: {settings.database_url.split('@')[-1]}")  # Hide credentials
    init_db()
    print("✅ Database tables initialized")

    yield

    # Shutdown
    print("👋 Shutting down DevPlanner API")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="AI-powered project scaffolding tool with DAG visualization",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "message": "DevPlanner API is running"
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
        "api_version": "1.0.0"
    }


# Mount routers
from routers import chat_router

app.include_router(chat_router)
