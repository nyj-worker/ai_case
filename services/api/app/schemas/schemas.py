"""
Pydantic 입출력 데이터 스키마 정의 (schemas/schemas.py)
클라이언트와 API 간 데이터 교환 및 유효성 검증을 담당합니다.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ==============================================================================
# 1. 공식 출처 및 증거 스키마
# ==============================================================================
class EvidenceSchema(BaseModel):
    id: Optional[str] = None
    sourceId: Optional[str] = Field(None, alias="source_id")
    claim: str
    quote: str
    locator: Optional[str] = None
    supportsPerformance: bool = Field(False, alias="supports_performance")

    class Config:
        populate_by_name = True
        from_attributes = True


class SourceSchema(BaseModel):
    id: str
    title: str
    publisher: str
    publishedAt: Optional[str] = Field(None, alias="published_at")
    url: str
    checkedAt: str = Field(..., alias="checked_at")
    accessStatus: str = Field(..., alias="access_status")
    role: Optional[str] = "개별 사례 근거"
    locator: Optional[str] = None

    class Config:
        populate_by_name = True
        from_attributes = True


# ==============================================================================
# 2. 남양주시 정책 적합성 평가 스키마
# ==============================================================================
class AssessmentBase(BaseModel):
    citizen_benefit: int = Field(3, ge=0, le=5, description="시민 편익 및 체감 효과 (가중치 20%)")
    work_reduction: int = Field(3, ge=0, le=5, description="공무원 업무시간 절감 (가중치 20%)")
    nyj_fit: int = Field(3, ge=0, le=5, description="남양주시 행정수요 적합성 (가중치 15%)")
    cost_efficiency: int = Field(3, ge=0, le=5, description="예산 및 비용 효율성 (가중치 15%)")
    tech_feasibility: int = Field(3, ge=0, le=5, description="기술 구현 가능성 (가중치 10%)")
    legal_safety: int = Field(4, ge=0, le=5, description="개인정보·법적·보안 적합성 (가중치 10%)")
    org_acceptability: int = Field(3, ge=0, le=5, description="조직 수용성 및 확산성 (가중치 10%)")
    analysis_reason: Optional[str] = Field(None, description="구체적 평가 사유 및 AI/전문가 제언")


class AssessmentCreate(AssessmentBase):
    case_id: str


class AssessmentUpdate(BaseModel):
    citizen_benefit: Optional[int] = Field(None, ge=0, le=5)
    work_reduction: Optional[int] = Field(None, ge=0, le=5)
    nyj_fit: Optional[int] = Field(None, ge=0, le=5)
    cost_efficiency: Optional[int] = Field(None, ge=0, le=5)
    tech_feasibility: Optional[int] = Field(None, ge=0, le=5)
    legal_safety: Optional[int] = Field(None, ge=0, le=5)
    org_acceptability: Optional[int] = Field(None, ge=0, le=5)
    analysis_reason: Optional[str] = None
    is_approved: Optional[bool] = None


class AssessmentResponse(AssessmentBase):
    id: str
    case_id: str
    total_score: float
    grade: str
    is_approved: bool
    assessed_by: str
    assessed_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# 3. AI 행정혁신 사례 스키마
# ==============================================================================
class CaseBase(BaseModel):
    id: str
    title: str
    region: str
    city: str
    category: str
    status: str
    summary: str
    tech: str
    benefit: Optional[str] = None
    performance: Optional[str] = "미확인"
    performance_verification: Optional[str] = "미확인"
    source_url: str
    source_title: Optional[str] = None
    published_at: Optional[str] = None
    checked_at: str
    status_as_of: Optional[str] = None
    current_status: Optional[str] = "미확인"
    verification: str
    implementation_evidence: bool = False
    budget: Optional[str] = "미확인"
    limitations: Optional[str] = None
    parent_case_id: Optional[str] = None
    record_type: Optional[str] = "독립 사업"
    is_demo: bool = False


class CaseListResponse(CaseBase):
    assessment: Optional[AssessmentResponse] = None

    class Config:
        from_attributes = True


class CaseDetailResponse(CaseBase):
    sources: List[SourceSchema] = []
    evidences: List[EvidenceSchema] = []
    assessment: Optional[AssessmentResponse] = None

    class Config:
        from_attributes = True


class CaseCreateRequest(BaseModel):
    title: str
    region: str
    city: str
    category: str
    status: str = "시범운영"
    summary: str
    tech: str
    benefit: Optional[str] = None
    performance: Optional[str] = "미확인"
    source_url: str
    source_title: Optional[str] = None
    verification: str = "원문 확인"
    implementation_evidence: bool = True
    budget: Optional[str] = "미확인"
    limitations: Optional[str] = None


# ==============================================================================
# 4. 정책 실행 과제 스키마 (칸반)
# ==============================================================================
class TaskCreate(BaseModel):
    case_id: Optional[str] = None
    task_name: str
    target_dept: str
    manager: Optional[str] = None
    status: str = "발굴"
    priority: str = "보통"
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    progress: int = 0
    budget_allocated: int = 0
    key_kpi: Optional[str] = None
    notes: Optional[str] = None


class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    target_dept: Optional[str] = None
    manager: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = None
    budget_allocated: Optional[int] = None
    key_kpi: Optional[str] = None
    notes: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    case_id: Optional[str]
    task_name: str
    target_dept: str
    manager: Optional[str]
    status: str
    priority: str
    start_date: Optional[str]
    target_date: Optional[str]
    progress: int
    budget_allocated: int
    key_kpi: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# 5. RAG AI 챗봇 스키마
# ==============================================================================
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    category_filter: Optional[str] = None
    region_filter: Optional[str] = None


class ChatSourceCitation(BaseModel):
    case_id: str
    title: str
    region: str
    source_title: Optional[str]
    source_url: str
    quote: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    citations: List[ChatSourceCitation] = []
    model: str
    confidence: str = "검증된 공식자료 기반"


# ==============================================================================
# 6. 대시보드 통계 스키마
# ==============================================================================
class RegionStat(BaseModel):
    region: str
    total_records: int
    verified_ops: int      # 원문 시행 확인
    index_ops: int         # 색인 시행 서술
    plan_index: int        # 계획/목차 수록
    gap_status: str        # 공백 여부 메시지


class CategoryStat(BaseModel):
    category: str
    count: int


class DashboardStats(BaseModel):
    total_records: int
    verified_independent_cases: int
    operational_cases: int
    pilot_cases: int
    planning_cases: int
    unconfirmed_cases: int
    top_recommended_cases: List[CaseListResponse]
    categories: List[CategoryStat]
    region_stats: List[RegionStat]
