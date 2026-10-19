"""
AI 혁신사례 CRUD 및 탐색 API (api/v1/cases.py)
목록 조회(필터/검색), 상세 조회, 신규 등록, 수정, 5개 사례 다자간 비교
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.entities import CaseModel, NyjAssessmentModel
from app.schemas.schemas import CaseListResponse, CaseDetailResponse, CaseCreateRequest
from app.services.evaluation_service import calculate_assessment_score

router = APIRouter(prefix="/cases", tags=["혁신사례"])


@router.get("", response_model=List[CaseListResponse])
def get_cases(
    query: Optional[str] = Query(None, description="통합 검색어 (정책명, 지역, 분야, 요약)"),
    region: Optional[str] = Query(None, description="광역시도 필터"),
    city: Optional[str] = Query(None, description="기초시군구 필터"),
    category: Optional[str] = Query(None, description="정책분야 필터"),
    status: Optional[str] = Query(None, description="사업상태 필터 (운영, 시범운영, 기획, 미확인)"),
    verification: Optional[str] = Query(None, description="검증범위 필터"),
    record_type: Optional[str] = Query(None, description="독립 사업 여부"),
    db: Session = Depends(get_db)
):
    """
    사례 목록 필터링 및 검색 조회
    """
    q = db.query(CaseModel)

    if query:
        search_fmt = f"%{query}%"
        q = q.filter(
            or_(
                CaseModel.title.ilike(search_fmt),
                CaseModel.region.ilike(search_fmt),
                CaseModel.city.ilike(search_fmt),
                CaseModel.category.ilike(search_fmt),
                CaseModel.summary.ilike(search_fmt),
                CaseModel.tech.ilike(search_fmt)
            )
        )

    if region:
        q = q.filter(CaseModel.region == region)
    if city:
        q = q.filter(CaseModel.city == city)
    if category:
        q = q.filter(CaseModel.category == category)
    if status:
        q = q.filter(CaseModel.status == status)
    if verification:
        q = q.filter(CaseModel.verification == verification)
    if record_type:
        q = q.filter(CaseModel.record_type == record_type)

    return q.all()


@router.get("/compare", response_model=List[CaseDetailResponse])
def compare_cases(
    ids: str = Query(..., description="비교할 사례 ID 목록 (콤마 구분, 최대 5개, 예: C001,C019,C020)"),
    db: Session = Depends(get_db)
):
    """
    최대 5개 사례 다자간 비교 조회
    지자체, 사업명, 기술, 성과, 구축비, 남양주시 적합성 등을 한눈에 대조
    """
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if len(id_list) > 5:
        id_list = id_list[:5]

    cases = db.query(CaseModel).filter(CaseModel.id.in_(id_list)).all()
    # 순서 유지
    case_dict = {c.id: c for c in cases}
    return [case_dict[cid] for cid in id_list if cid in case_dict]


@router.get("/{id}", response_model=CaseDetailResponse)
def get_case_detail(id: str, db: Session = Depends(get_db)):
    """
    사례 상세 조회 (출처 목록, 원문 인용 증거, 남양주시 적합성 평가 포함)
    """
    case = db.query(CaseModel).filter(CaseModel.id == id).first()
    if not case:
        raise HTTPException(status_code=404, detail="해당 사례를 찾을 수 없습니다.")
    return case


@router.post("", response_model=CaseDetailResponse)
def create_case(case_in: CaseCreateRequest, db: Session = Depends(get_db)):
    """
    신규 사례 등록 (연구자 및 관리자 기능)
    """
    # 새 ID 생성 (예: C027, C028 ...)
    max_case = db.query(CaseModel).order_by(CaseModel.id.desc()).first()
    next_num = 27
    if max_case and max_case.id.startswith("C"):
        try:
            next_num = int(max_case.id[1:]) + 1
        except ValueError:
            pass
    new_id = f"C{next_num:03d}"

    new_case = CaseModel(
        id=new_id,
        title=case_in.title,
        region=case_in.region,
        city=case_in.city,
        category=case_in.category,
        status=case_in.status,
        summary=case_in.summary,
        tech=case_in.tech,
        benefit=case_in.benefit,
        performance=case_in.performance,
        source_url=case_in.source_url,
        source_title=case_in.source_title,
        checked_at="2026-10-17",
        verification=case_in.verification,
        implementation_evidence=case_in.implementation_evidence,
        budget=case_in.budget,
        limitations=case_in.limitations,
        record_type="독립 사업",
        is_demo=False
    )
    db.add(new_case)
    db.flush()

    # 기본 적합성 평가 생성
    total_score, grade = calculate_assessment_score(3, 3, 3, 3, 3, 4, 3)
    assessment = NyjAssessmentModel(
        id=f"ASSESS_{new_id}",
        case_id=new_id,
        citizen_benefit=3,
        work_reduction=3,
        nyj_fit=3,
        cost_efficiency=3,
        tech_feasibility=3,
        legal_safety=4,
        org_acceptability=3,
        total_score=total_score,
        grade=grade,
        analysis_reason="신규 등록 사례로 담당자 적합성 검토 대기 중입니다."
    )
    db.add(assessment)
    db.commit()
    db.refresh(new_case)
    return new_case
