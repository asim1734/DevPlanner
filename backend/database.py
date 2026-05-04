"""
Database engine creation and session management.
Provides dependency injection for FastAPI routes.
"""
from sqlmodel import Session, create_engine
from typing import Generator
from config import settings


# Create database engine with appropriate settings for the database type
engine_kwargs = {
    "echo": settings.debug,
    "pool_pre_ping": True,
}

# Add connection pooling only for non-SQLite databases
if not settings.database_url.startswith("sqlite"):
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
    })

engine = create_engine(settings.database_url, **engine_kwargs)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency injection for database sessions.
    Usage: session: Session = Depends(get_session)
    """
    with Session(engine) as session:
        yield session


def init_db() -> None:
    """
    Create all database tables.
    Called during app startup.
    """
    from sqlmodel import SQLModel
    from models.chat_session import ChatSession
    from models.project import Project
    from models.task import Task
    from models.dependency import TaskDependency
    from models.parse_failure import ParseFailure

    SQLModel.metadata.create_all(engine)
