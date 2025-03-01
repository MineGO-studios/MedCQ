import os
from typing import List, Optional, Union
from pydantic import BaseSettings, AnyHttpUrl, validator
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # Base API settings
    API_PREFIX: str = "/api"
    VERSION: str = "0.1.0"
    PROJECT_NAME: str = "MedCQ API"
    PROJECT_DESCRIPTION: str = "Backend API for MedCQ - Medical Multiple Choice Questions Platform"
    
    # CORS settings
    CORS_ORIGINS: List[AnyHttpUrl] = []
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Firebase settings
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    
    # Supabase settings
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    # Environment
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = ENV == "development"
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @validator("FIREBASE_CREDENTIALS_PATH")
    def validate_firebase_credentials(cls, v: Optional[str], values: dict) -> Optional[str]:
        if not v and values.get("ENV") != "test":
            print("Warning: FIREBASE_CREDENTIALS_PATH not set")
        return v
    
    @validator("SUPABASE_URL", "SUPABASE_KEY")
    def validate_supabase_settings(cls, v: Optional[str], values: dict, field: str) -> Optional[str]:
        if not v and values.get("ENV") != "test":
            print(f"Warning: {field} not set")
        return v
    
    class Config:
        case_sensitive = True
        env_file = ".env"


# Create settings instance
settings = Settings()

# Add default CORS origins for development
if settings.ENV == "development" and not settings.CORS_ORIGINS:
    settings.CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]