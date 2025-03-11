# backend/api/index.py
from app.api.main import app
from fastapi.middleware.cors import CORSMiddleware
import os

# Configure CORS for production environment
if os.environ.get("ENV") == "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://medcq.vercel.app"],  # Update with your frontend URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

# Exposing the app for Vercel serverless functions
handler = app