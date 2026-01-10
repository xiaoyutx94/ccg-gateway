from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import DATA_DIR


class Base(DeclarativeBase):
    pass


# Create async engine
engine = create_async_engine(
    f"sqlite+aiosqlite:///{DATA_DIR}/ccg_gateway.db",
    echo=False,
    connect_args={"check_same_thread": False}
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
