from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Make `app` importable when alembic runs from backend/.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.db.base import Base
# Importing all models so their tables are registered on Base.metadata.
from app.db import models  # noqa: F401


def include_object(object, name, type_, reflected, compare_to):
    """Only manage objects in the 'public' schema.
    PostGIS tiger/topology tables live in other schemas and must be ignored."""
    if hasattr(object, "schema") and object.schema not in (None, "public"):
        return False
    # Also ignore reflected objects that have no model counterpart
    # (catches PostGIS tables in public schema like spatial_ref_sys)
    if reflected and compare_to is None:
        return False
    return True


def include_name(name, type_, parent_names):
    """Restrict reflection to the 'public' schema."""
    if type_ == "schema":
        return name in (None, "public")
    return True

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        include_name=include_name,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            include_name=include_name,
        )
        with context.begin_transaction():
            context.run_migrations()


def _include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table" and name in {"spatial_ref_sys"}:
        return False
    return True


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()