"""
데이터베이스 세션 관리 모듈 (db/session.py)
SQLAlchemy를 활용하여 데이터베이스 연결 엔진과 세션을 생성하고 생명주기를 관리합니다.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# SQLite 연결 시 멀티스레드 접근을 허용하는 옵션 설정
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# SQLAlchemy 동기 데이터베이스 엔진 생성
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False  # SQL 쿼리 로그 출력 필요 시 True로 변경 가능
)

# 데이터베이스 세션을 생성하는 팩토리 함수
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모든 ORM 모델의 부모 클래스가 되는 선언적 기본 클래스
Base = declarative_base()


def get_db():
    """
    FastAPI 엔드포인트에서 데이터베이스 세션을 주입받기 위한 종속성 함수(Dependency).
    요청이 들어올 때 세션을 열고, 요청 처리가 끝나면 자동으로 세션을 닫습니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
