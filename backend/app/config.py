import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Software Engineering Assistant"
    API_V1_STR: str = "/api"
    
    # Gemini LLM
    GEMINI_API_KEY: str = ""
    DEFAULT_GEMINI_MODEL: str = "gemini-2.5-flash"
    MOCK_LLM: bool = False
    
    # GitHub Integration
    GITHUB_TOKEN: str = ""
    GITHUB_API_URL: str = "https://api.github.com"
    
    # Database
    DATABASE_URL: str = "sqlite:///./engineering_assistant.db"
    
    # Vector DB
    VECTOR_DB_PATH: str = "./chroma_data"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"  # local fast embedding model
    
    # Host & Debug
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Storage for cloned repos
    REPOS_STORAGE_DIR: str = "./downloaded_repos"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
Path(settings.VECTOR_DB_PATH).mkdir(parents=True, exist_ok=True)
Path(settings.REPOS_STORAGE_DIR).mkdir(parents=True, exist_ok=True)
