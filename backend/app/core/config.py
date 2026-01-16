import sys
from pathlib import Path
from pydantic_settings import BaseSettings


def get_base_dir() -> Path:
    """Get base directory, handling PyInstaller bundled mode."""
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent.parent


def get_data_dir() -> Path:
    return get_base_dir() / "data"


def get_env_file() -> Path:
    if getattr(sys, 'frozen', False):
        return get_base_dir() / ".env"
    return get_base_dir().parent / ".env"


class Settings(BaseSettings):
    PROJECT_NAME: str = "CCG-Gateway"
    VERSION: str = "0.1.0"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/ccg_gateway.db"

    # Gateway defaults
    GATEWAY_PORT: int = 7788
    GATEWAY_HOST: str = "127.0.0.1"

    # Timeout defaults (seconds)
    STREAM_FIRST_BYTE_TIMEOUT: int = 30
    STREAM_IDLE_TIMEOUT: int = 60
    NON_STREAM_TIMEOUT: int = 120

    # Logging
    LOG_TO_FILE: bool = False

    class Config:
        env_file = get_env_file()
        case_sensitive = True
        extra = "ignore"


settings = Settings()

# Ensure data directory exists
DATA_DIR = get_data_dir()
DATA_DIR.mkdir(exist_ok=True)
