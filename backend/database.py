from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./jobhunt.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema():
    """Add new columns to an existing local SQLite database without destroying data."""
    inspector = inspect(engine)
    if "jobs" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("jobs")}
    additions = {
        "source": "VARCHAR",
        "posted_at": "VARCHAR",
        "employment_type": "VARCHAR",
        "experience_required": "VARCHAR",
        "experience_months": "INTEGER",
        "enrichment_status": "VARCHAR DEFAULT 'pending'",
        "enrichment_error": "TEXT",
        "enriched_at": "VARCHAR",
        "match_percentage": "FLOAT",
        "resume_feedback": "TEXT",
    }

    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in existing:
                connection.execute(
                    text(f"ALTER TABLE jobs ADD COLUMN {name} {definition}")
                )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
