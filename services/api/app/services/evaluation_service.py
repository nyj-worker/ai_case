"""
남양주시 정책 적합성 평가 엔진 (services/evaluation_service.py)
7대 평가 기준과 가중치를 기반으로 100점 만점 점수 및 우선순위 등급을 산출합니다.
"""

from typing import Tuple


def calculate_assessment_score(
    citizen_benefit: int,
    work_reduction: int,
    nyj_fit: int,
    cost_efficiency: int,
    tech_feasibility: int,
    legal_safety: int,
    org_acceptability: int
) -> Tuple[float, str]:
    """
    남양주시 정책 적합성 점수 및 등급 계산 함수
    
    [가중치 체계]
    1. 시민 편익 및 체감 효과: 20% (배점 계수: 4.0)
    2. 공무원 업무시간 절감: 20% (배점 계수: 4.0)
    3. 남양주시 행정수요 적합성: 15% (배점 계수: 3.0)
    4. 예산 및 비용 효율성: 15% (배점 계수: 3.0)
    5. 기술 구현 가능성: 10% (배점 계수: 2.0)
    6. 개인정보·법적·보안 적합성: 10% (배점 계수: 2.0)
    7. 조직 수용성 및 확산성: 10% (배점 계수: 2.0)
    
    총점 = Σ(기준별 점수 ÷ 5 × 가중치) = (각 점수 × 배점 계수)의 합
    최대 100점 만점
    """
    # 각 지표가 0~5점 범위를 만족하도록 클램핑(보정)
    cb = max(0, min(5, citizen_benefit))
    wr = max(0, min(5, work_reduction))
    nf = max(0, min(5, nyj_fit))
    ce = max(0, min(5, cost_efficiency))
    tf = max(0, min(5, tech_feasibility))
    ls = max(0, min(5, legal_safety))
    oa = max(0, min(5, org_acceptability))

    # 가중합 총점 계산 (소수점 1자리 반올림)
    total_score = round(
        (cb * 4.0) + (wr * 4.0) + (nf * 3.0) + (ce * 3.0) + (tf * 2.0) + (ls * 2.0) + (oa * 2.0),
        1
    )

    # 마스터 프롬프트 정의 평가 등급 판정
    # 85~100: 최우선 검토
    # 70~84: 우선 검토
    # 55~69: 중장기 검토
    # 0~54: 추가 검토 필요
    if total_score >= 85.0:
        grade = "최우선 검토"
    elif total_score >= 70.0:
        grade = "우선 검토"
    elif total_score >= 55.0:
        grade = "중장기 검토"
    else:
        grade = "추가 검토 필요"

    return total_score, grade
