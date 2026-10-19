"""
지역 및 행정구역 API (api/v1/regions.py)
17개 시도 및 하위 시군구, 조사 커버리지 현황 제공
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import RegionModel, CaseModel

router = APIRouter(prefix="/regions", tags=["지역"])


@router.get("", response_model=List[Dict[str, Any]])
def get_regions(db: Session = Depends(get_db)):
    """
    17개 광역 시도 및 해당 시도에 등록된 사례 건수 반환
    """
    regions = db.query(RegionModel).filter(RegionModel.type != "기초").all()
    results = []
    for r in regions:
        case_count = db.query(CaseModel).filter(CaseModel.region == r.name).count()
        results.append({
            "id": r.id,
            "name": r.name,
            "type": r.type,
            "case_count": case_count
        })
    return results


@router.get("/{region_name}/cities")
def get_cities_in_region(region_name: str, db: Session = Depends(get_db)):
    """
    특정 시도 내에서 사례가 수집된 시군구 목록 반환
    """
    cases = db.query(CaseModel).filter(CaseModel.region == region_name).all()
    cities = sorted(list(set(c.city for c in cases if c.city)))
    return {
        "region": region_name,
        "cities": cities,
        "total_cases": len(cases)
    }
