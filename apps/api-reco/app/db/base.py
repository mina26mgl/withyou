from sqlalchemy import JSON, BigInteger, Integer, MetaData
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase

# All tables of this service live in their own PostgreSQL schema so they never
# collide with the Prisma tables of api-core (schema `public`).
SCHEMA = "reco"

NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

# BIGSERIAL on PostgreSQL; plain INTEGER on SQLite so tests get autoincrement.
BigIntPK = BigInteger().with_variant(Integer(), "sqlite")
BigIntFK = BigInteger().with_variant(Integer(), "sqlite")
JSONDict = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    metadata = MetaData(schema=SCHEMA, naming_convention=NAMING_CONVENTION)
