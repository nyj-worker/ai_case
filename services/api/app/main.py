"""
FastAPI 애플리케이션 메인 엔트리포인트 (app/main.py)
전국 지자체 AI 행정혁신 정책연구 플랫폼 백엔드 서버
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.services.seed_service import load_seed_data

# API 라우터 임포트
from app.api.v1.cases import router as cases_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.regions import router as regions_router
from app.api.v1.assessment import router as assessment_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.ai import router as ai_router
from app.api.v1.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 시작 및 종료 생명주기 관리
    - 서버 시작 시 데이터베이스 테이블 자동 생성
    - 첨부된 실데이터(26건의 사례, 33건의 출처) 자동 초기 적재 실행
    """
    print("=" * 60)
    print("[System] 전국 지자체 AI 행정혁신 정책연구 플랫폼 백엔드 시작")
    print(f"[Config] DB URL: {settings.DATABASE_URL}")
    print("=" * 60)

    # 1. ORM 테이블 생성
    Base.metadata.create_all(bind=engine)

    # 2. 실데이터 자동 적재
    db = SessionLocal()
    try:
        load_seed_data(db)
    except Exception as e:
        print(f"[SeedService] 데이터 적재 중 오류 발생: {e}")
    finally:
        db.close()

    yield

    print("[System] 백엔드 서버가 종료되었습니다.")


# FastAPI 앱 생성
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="대한민국 전국 광역·기초 지자체 AI 혁신사례 연구 및 남양주시 정책 적용을 위한 프로덕션 API",
    lifespan=lifespan
)

# CORS 미들웨어 등록 (Next.js 프론트엔드 연동)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 라우터 등록
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(cases_router, prefix=settings.API_V1_STR)
app.include_router(regions_router, prefix=settings.API_V1_STR)
app.include_router(assessment_router, prefix=settings.API_V1_STR)
app.include_router(tasks_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    """
    서버 상태 확인용 루트 엔드포인트
    """
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "docs_url": "/docs",
        "author": "남양주시 스마트 행정혁신 연구동아리"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
