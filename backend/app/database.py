import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Manually load .env file if it exists (avoids extra dependencies in scripts)
for env_path in [".env", "../.env", "backend/.env"]:
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip("'\"")
        break

# Database URL configured via environment variables
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://Krishna-Singh:dishpass@localhost:5432/dishboard"
)

# SQLAlchemy 2.0 defaults postgresql:// to psycopg2.
# We map it to use psycopg (v3) which is installed in the requirements.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Create engine for synchronous PostgreSQL interaction
engine = create_engine(DATABASE_URL)

# Configure database session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base model class
Base = declarative_base()

# DB dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
