"""
통합 대시보드 API 엔드포인트 (api/v1/dashboard.py)
전국 AI 행정혁신 현황 KPI, 17개 시도별 커버리지, 분야별 통계 제공
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.entities import CaseModel, NyjAssessmentModel
from app.schemas.schemas import DashboardStats, RegionStat, CategoryStat, CaseListResponse

router = APIRouter(prefix="/dashboard", tags=["대시보드"])

# 17개 공식 시도 기본 순서
OFFICIAL_REGIONS = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
    "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
    "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도",
    "경상남도", "제주특별자치도"
]


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    통합 대시보드 KPI 및 분석 지표 반환
    - 총 수록 레코드 수 (26건)
    - 원문 시행확인 독립 사업 건수 (17건)
    - 상태별(운영, 시범운영, 기획, 미확인) 건수
    - 남양주시 정책 적용 추천 상위 사례 (85점 이상 등 최우선 검토군)
    - 17개 시도별 원문 시행확인 및 공백 현황
    - 정책 분야별 분포
    """
    total_records = db.query(CaseModel).count()
    verified_ops = db.query(CaseModel).filter(
        CaseModel.verification == "원문 확인",
        CaseModel.implementation_evidence == True,
        CaseModel.record_type == "독립 사업"
    ).count()

    operational_cases = db.query(CaseModel).filter(CaseModel.status == "운영").count()
    pilot_cases = db.query(CaseModel).filter(CaseModel.status == "시범운영").count()
    planning_cases = db.query(CaseModel).filter(CaseModel.status == "기획").count()
    unconfirmed_cases = db.query(CaseModel).filter(CaseModel.status == "미확인").count()

    # 정책 분야별 통계
    cat_rows = db.query(CaseModel.category, func.count(CaseModel.id)).group_by(CaseModel.category).all()
    categories = [CategoryStat(category=row[0], count=row[1]) for row in cat_rows]
    categories.sort(key=lambda x: x.count, reverse=True)

    # 17개 시도별 세부 통계 계산
    region_stats: List[RegionStat] = []
    for reg_name in OFFICIAL_REGIONS:
        reg_cases = db.query(CaseModel).filter(CaseModel.region == reg_name).all()
        cnt_total = len(reg_cases)
        cnt_verified = sum(1 for c in reg_cases if c.verification in ["원문 확인", "원문 교차확인"] and c.implementation_evidence)
        cnt_index = sum(1 for c in reg_cases if c.verification == "색인 확인·재검증 필요")
        cnt_plan = sum(1 for c in reg_cases if c.verification == "문헌 수록 확인" or c.status == "기획")

        if cnt_verified > 0:
            gap_status = "원문 기반 시행 확인 사례 있음"
        elif cnt_total > 0:
            gap_status = "원문 기반 시행 확인 공백"
        else:
            gap_status = "조사 미실시"

        region_stats.append(RegionStat(
            region=reg_name,
            total_records=cnt_total,
            verified_ops=cnt_verified,
            index_ops=cnt_index,
            plan_index=cnt_plan,
            gap_status=gap_status
        ))

    # 남양주시 적용 추천 상위 정책 (평가 점수 기준 정렬)
    top_assessments = db.query(NyjAssessmentModel).order_by(NyjAssessmentModel.total_score.desc()).limit(5).all()
    top_case_ids = [a.case_id for a in top_assessments]
    top_cases = []
    for cid in top_case_ids:
        c = db.query(CaseModel).filter(CaseModel.id == cid).first()
        if c:
            top_cases.append(c)

    return DashboardStats(
        total_records=total_records,
        verified_independent_cases=verified_ops,
        operational_cases=operational_cases,
        pilot_cases=pilot_cases,
        planning_cases=planning_cases,
        unconfirmed_cases=unconfirmed_cases,
        top_recommended_cases=top_cases,
        categories=categories,
        region_stats=region_stats
    )
