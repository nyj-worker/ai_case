"""
설정 모듈 (core/config.py)
전국 지자체 AI 행정혁신 정책연구 플랫폼 백엔드 설정 관리
"""

import secrets
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path


class Settings(BaseSettings):
    """
    애플리케이션 전역 환경설정 클래스
    - 환경변수(.env) 또는 기본값을 통해 데이터베이스, Groq/xAI API 키, 보안 설정을 로드합니다.
    """
    # 프로젝트 기본 정보
    PROJECT_NAME: str = "전국 지자체 AI 행정혁신 정책연구 플랫폼 API"
    PROJECT_VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 기본 데이터베이스 설정
    DATABASE_URL: str = Field(
        default="sqlite:///./ai_local_research.db",
        description="SQLAlchemy 데이터베이스 연결 URL"
    )

    # CORS 허용 오리진 목록 (프론트엔드 통신 허용)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ]

    # 첨부된 검증 데이터셋 폴더 경로 (프로젝트 루트 기준 동적 탐색 지원)
    SEED_DATA_DIR: Path = (
        Path(__file__).resolve().parent.parent.parent.parent / "ai-local-research-2026-10-17"
        if (Path(__file__).resolve().parent.parent.parent.parent / "ai-local-research-2026-10-17").exists()
        else Path("d:/03_ANTI_G/13_혁신사례/ai-local-research-2026-10-17")
    )
    
    # Groq 초고속 AI 추론 API 설정 (초당 300~500 토큰 초고속 응답)
    GROQ_API_KEY: str = Field(default="", description="Groq LPU API 키")
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_FAST_MODEL: str = "openai/gpt-oss-20b"

    # 외부 추가 AI API 설정
    XAI_API_KEY: str = Field(default="", description="xAI Grok API 키")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API 키")
    AI_MODEL_NAME: str = "grok-2-latest"

    # 보안 및 JWT 비밀키
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1일

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


# 설정 인스턴스 생성
settings = Settings()
