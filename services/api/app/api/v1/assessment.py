"""
남양주시 정책 적합성 평가 API (api/v1/assessment.py)
7대 기준 가중치 계산, 평가 수정, 시뮬레이션 및 승인 관리
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import CaseModel, NyjAssessmentModel
from app.schemas.schemas import AssessmentResponse, AssessmentUpdate, AssessmentBase
from app.services.evaluation_service import calculate_assessment_score

router = APIRouter(prefix="/assessments", tags=["남양주 정책 적합성 평가"])


@router.get("/{case_id}", response_model=AssessmentResponse)
def get_assessment(case_id: str, db: Session = Depends(get_db)):
    """
    특정 사례의 남양주시 적합성 평가 결과 조회
    """
    assess = db.query(NyjAssessmentModel).filter(NyjAssessmentModel.case_id == case_id).first()
    if not assess:
        raise HTTPException(status_code=404, detail="해당 사례의 평가 데이터를 찾을 수 없습니다.")
    return assess


@router.put("/{case_id}", response_model=AssessmentResponse)
def update_assessment(case_id: str, update_in: AssessmentUpdate, db: Session = Depends(get_db)):
    """
    사례별 평가 점수 및 담당자 제언 수정 (실시간 총점 및 등급 재계산)
    """
    assess = db.query(NyjAssessmentModel).filter(NyjAssessmentModel.case_id == case_id).first()
    if not assess:
        raise HTTPException(status_code=404, detail="해당 사례의 평가 데이터를 찾을 수 없습니다.")

    # 수정 필드 적용
    if update_in.citizen_benefit is not None:
        assess.citizen_benefit = update_in.citizen_benefit
    if update_in.work_reduction is not None:
        assess.work_reduction = update_in.work_reduction
    if update_in.nyj_fit is not None:
        assess.nyj_fit = update_in.nyj_fit
    if update_in.cost_efficiency is not None:
        assess.cost_efficiency = update_in.cost_efficiency
    if update_in.tech_feasibility is not None:
        assess.tech_feasibility = update_in.tech_feasibility
    if update_in.legal_safety is not None:
        assess.legal_safety = update_in.legal_safety
    if update_in.org_acceptability is not None:
        assess.org_acceptability = update_in.org_acceptability
    if update_in.analysis_reason is not None:
        assess.analysis_reason = update_in.analysis_reason
    if update_in.is_approved is not None:
        assess.is_approved = update_in.is_approved

    # 재계산
    score, grade = calculate_assessment_score(
        assess.citizen_benefit,
        assess.work_reduction,
        assess.nyj_fit,
        assess.cost_efficiency,
        assess.tech_feasibility,
        assess.legal_safety,
        assess.org_acceptability
    )
    assess.total_score = score
    assess.grade = grade

    db.commit()
    db.refresh(assess)
    return assess


@router.post("/simulate")
def simulate_assessment(sim_in: AssessmentBase):
    """
    가중치 및 점수 시뮬레이터 (DB 저장 없이 즉시 총점과 등급 계산)
    """
    score, grade = calculate_assessment_score(
        sim_in.citizen_benefit,
        sim_in.work_reduction,
        sim_in.nyj_fit,
        sim_in.cost_efficiency,
        sim_in.tech_feasibility,
        sim_in.legal_safety,
        sim_in.org_acceptability
    )
    return {
        "total_score": score,
        "grade": grade,
        "weights": {
            "citizen_benefit": "20%",
            "work_reduction": "20%",
            "nyj_fit": "15%",
            "cost_efficiency": "15%",
            "tech_feasibility": "10%",
            "legal_safety": "10%",
            "org_acceptability": "10%"
        }
    }
