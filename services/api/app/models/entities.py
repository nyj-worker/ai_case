"""
데이터베이스 ORM 엔터티 모델 정의 (models/entities.py)
전국 지자체 AI 행정혁신 사례, 공식 출처, 인용 증거, 남양주시 적합성 평가 및 실행 과제 테이블 정의
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.db.session import Base


class RegionModel(Base):
    """
    1. 전국 17개 광역시도 및 하위 기초 시군구 모델
    """
    __tablename__ = "regions"

    id = Column(String(50), primary_key=True, index=True, comment="행정구역 코드 또는 식별자")
    name = Column(String(100), nullable=False, index=True, comment="지역명 (예: 서울특별시, 경기도, 남양주시)")
    type = Column(String(20), nullable=False, comment="광역 / 기초 / 특별자치")
    parent_id = Column(String(50), ForeignKey("regions.id"), nullable=True, comment="상위 광역 지자체 ID")
    is_active = Column(Boolean, default=True, comment="사용 여부")
    created_at = Column(DateTime, default=datetime.utcnow)

    # 계층 관계 정의 (광역 -> 시군구 목록)
    children = relationship("RegionModel", backref="parent", remote_side=[id])


class CategoryModel(Base):
    """
    2. 정책 분야 분류 모델 (복지·돌봄, 민원응대, 교통, 내부행정 등)
    """
    __tablename__ = "categories"

    id = Column(String(50), primary_key=True, index=True, comment="분야 코드")
    name = Column(String(100), nullable=False, index=True, comment="분야 명칭")
    description = Column(Text, nullable=True, comment="분야 상세 설명")
    sort_order = Column(Integer, default=0, comment="정렬 순서")


# 사례-출처 다대다(M:N) 연결 테이블
case_sources_table = Table(
    "case_sources",
    Base.metadata,
    Column("case_id", String(50), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("source_id", String(50), ForeignKey("sources.id", ondelete="CASCADE"), primary_key=True)
)


class CaseModel(Base):
    """
    3. AI 혁신사례 핵심 모델 (검증된 26개 사례 및 추가 사례 저장)
    """
    __tablename__ = "cases"

    id = Column(String(50), primary_key=True, index=True, comment="사례 고유 식별자 (예: C001, C002)")
    title = Column(String(255), nullable=False, index=True, comment="정책 사업명")
    region = Column(String(100), nullable=False, index=True, comment="광역시도명 (예: 경기도)")
    city = Column(String(100), nullable=False, comment="기초지자체명 또는 '광역'")
    category = Column(String(100), nullable=False, index=True, comment="주 정책분야")
    status = Column(String(50), nullable=False, index=True, comment="운영 / 시범운영 / 기획 / 미확인")
    summary = Column(Text, nullable=False, comment="사업 개요 및 주요 내용")
    tech = Column(String(255), nullable=False, comment="활용 AI 기술")
    benefit = Column(Text, nullable=True, comment="시민 편익 및 기대효과")
    performance = Column(Text, default="미확인", comment="정량/정성 성과")
    performance_verification = Column(String(100), default="미확인", comment="성과 검증 상태")
    source_url = Column(Text, nullable=False, comment="공식 원문 URL")
    source_title = Column(String(255), nullable=True, comment="출처 문서명")
    published_at = Column(String(50), nullable=True, comment="발표일 또는 게시일")
    checked_at = Column(String(50), nullable=False, comment="조사 확인일")
    status_as_of = Column(String(50), nullable=True, comment="출처 당시 상태 기준일")
    current_status = Column(String(50), default="미확인", comment="현재 지속운영 여부 (미확인 원칙)")
    verification = Column(String(100), nullable=False, index=True, comment="원문 확인 / 원문 교차확인 / 색인 확인 / 문헌 수록")
    implementation_evidence = Column(Boolean, default=False, comment="실제 시행 증거 자료 유무")
    budget = Column(String(100), default="미확인", comment="예산 (구축비/운영비)")
    limitations = Column(Text, nullable=True, comment="한계점 및 유의사항")
    parent_case_id = Column(String(50), nullable=True, comment="상위 사업 식별자 (중복 안내 매핑)")
    record_type = Column(String(100), default="독립 사업", comment="독립 사업 / 지역 접수 안내 / 공식 목차 수록")
    is_demo = Column(Boolean, default=False, comment="데모용 여부 (실제 검증 사례는 False)")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계 설정
    sources = relationship("SourceModel", secondary=case_sources_table, back_populates="cases")
    evidences = relationship("EvidenceClaimModel", back_populates="case", cascade="all, delete-orphan")
    assessment = relationship("NyjAssessmentModel", back_populates="case", uselist=False, cascade="all, delete-orphan")
    tasks = relationship("PolicyTaskModel", back_populates="case")


class SourceModel(Base):
    """
    4. 공식 출처 모델 (1~3순위 공공기관 공식 자료 메타데이터)
    """
    __tablename__ = "sources"

    id = Column(String(50), primary_key=True, index=True, comment="출처 고유 ID (예: S01, S02)")
    title = Column(String(255), nullable=False, comment="공식 문서명")
    publisher = Column(String(100), nullable=False, index=True, comment="발행 기관")
    published_at = Column(String(50), nullable=True, comment="발행일")
    url = Column(Text, nullable=False, comment="공식 원문 URL")
    checked_at = Column(String(50), nullable=False, comment="확인일")
    access_status = Column(String(100), nullable=False, comment="원문 텍스트 확인 / 검색 색인 확인 등")
    role = Column(String(100), default="개별 사례 근거", comment="근거 역할")
    locator = Column(Text, nullable=True, comment="본문 위치 안내")
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계 설정
    cases = relationship("CaseModel", secondary=case_sources_table, back_populates="sources")
    evidences = relationship("EvidenceClaimModel", back_populates="source")


class EvidenceClaimModel(Base):
    """
    5. 사실 주장 및 원문 인용 증거 모델 (Evidence Claims)
    """
    __tablename__ = "evidence_claims"

    id = Column(String(50), primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(String(50), ForeignKey("sources.id", ondelete="CASCADE"), nullable=True)
    claim = Column(String(255), nullable=False, comment="주장 내용 (예: 시행 및 기능, 성과)")
    quote = Column(Text, nullable=False, comment="원문 직접 인용문")
    locator = Column(String(255), nullable=True, comment="본문 내 위치")
    supports_performance = Column(Boolean, default=False, comment="성과 입증 여부")
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계 설정
    case = relationship("CaseModel", back_populates="evidences")
    source = relationship("SourceModel", back_populates="evidences")


class NyjAssessmentModel(Base):
    """
    6. 남양주시 정책 적합성 7대 평가 모델 (100점 만점 엔진)
    """
    __tablename__ = "nyj_assessments"

    id = Column(String(50), primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, unique=True)
    citizen_benefit = Column(Integer, nullable=False, default=3, comment="시민 편익 및 체감 효과 (가중치 20%, 0~5점)")
    work_reduction = Column(Integer, nullable=False, default=3, comment="공무원 업무시간 절감 (가중치 20%, 0~5점)")
    nyj_fit = Column(Integer, nullable=False, default=3, comment="남양주시 행정수요 적합성 (가중치 15%, 0~5점)")
    cost_efficiency = Column(Integer, nullable=False, default=3, comment="예산 및 비용 효율성 (가중치 15%, 0~5점)")
    tech_feasibility = Column(Integer, nullable=False, default=3, comment="기술 구현 가능성 (가중치 10%, 0~5점)")
    legal_safety = Column(Integer, nullable=False, default=4, comment="개인정보·법적·보안 적합성 (가중치 10%, 0~5점)")
    org_acceptability = Column(Integer, nullable=False, default=3, comment="조직 수용성 및 확산성 (가중치 10%, 0~5점)")
    total_score = Column(Float, nullable=False, default=60.0, comment="가중합 100점 만점 환산 점수")
    grade = Column(String(50), nullable=False, default="중장기 검토", comment="최우선 검토/우선 검토/중장기 검토/추가 검토 필요")
    analysis_reason = Column(Text, nullable=True, comment="평가 사유 및 남양주시 맞춤형 제언")
    is_approved = Column(Boolean, default=False, comment="담당자 최종 승인 여부")
    assessed_by = Column(String(100), default="남양주시 스마트 행정혁신 연구동아리")
    assessed_at = Column(DateTime, default=datetime.utcnow)

    # 관계 설정
    case = relationship("CaseModel", back_populates="assessment")


class PolicyTaskModel(Base):
    """
    7. 남양주시 정책 실행 과제 모델 (칸반/타임라인 관리)
    """
    __tablename__ = "policy_tasks"

    id = Column(String(50), primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    task_name = Column(String(255), nullable=False, comment="추진 과제명")
    target_dept = Column(String(100), nullable=False, comment="담당 부서 (예: 첨단교통과, 복지기획과)")
    manager = Column(String(50), nullable=True, comment="담당자")
    status = Column(String(50), nullable=False, default="발굴", comment="발굴/검토/타당성조사/시범운영/정식운영/보류")
    priority = Column(String(30), default="보통", comment="최우선/높음/보통")
    start_date = Column(String(30), nullable=True, comment="시작일")
    target_date = Column(String(30), nullable=True, comment="완료 목표일")
    progress = Column(Integer, default=0, comment="진행률 (0~100%)")
    budget_allocated = Column(Integer, default=0, comment="배정 예산 (단위: 원)")
    key_kpi = Column(Text, nullable=True, comment="핵심 성과지표")
    notes = Column(Text, nullable=True, comment="추진 메모 및 현황")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계 설정
    case = relationship("CaseModel", back_populates="tasks")


class UserModel(Base):
    """
    8. 사용자 및 RBAC 역할 모델 (보안 관리)
    """
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=True)
    role = Column(String(30), nullable=False, default="PUBLIC", comment="PUBLIC, RESEARCHER, STAFF, REVIEWER, ADMIN")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLogModel(Base):
    """
    9. 시스템 감사 로그 모델 (접근 및 작업 추적)
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)
    target_entity = Column(String(50), nullable=True)
    target_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
