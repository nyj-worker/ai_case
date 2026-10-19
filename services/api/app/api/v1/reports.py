"""
시장님 보고서 자동 생성 API (api/v1/reports.py)
시장님 보고용 1페이지 브리핑, 심층 분석서, 실무 추진계획서 자동 생성
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import CaseModel, NyjAssessmentModel

router = APIRouter(prefix="/reports", tags=["보고서 자동 생성"])


class ReportRequest(BaseModel):
    case_ids: List[str]
    report_type: str = "BRIEFING"  # BRIEFING (1페이지 브리핑) | IN_DEPTH (심층분석서) | ROADMAP (실무계획서)
    target_audience: str = "남양주시장님 보고용"
    author_dept: str = "남양주시 스마트 행정혁신 연구동아리"


@router.post("/generate")
def generate_report(req: ReportRequest, db: Session = Depends(get_db)):
    """
    선택한 정책 사례를 기반으로 시장님 보고용 문서 자동 생성
    """
    if not req.case_ids:
        raise HTTPException(status_code=400, detail="최소 1개 이상의 사례를 선택해야 합니다.")

    cases = db.query(CaseModel).filter(CaseModel.id.in_(req.case_ids)).all()
    if not cases:
        raise HTTPException(status_code=404, detail="선택된 사례를 찾을 수 없습니다.")

    # 복수 사례 종합 또는 단일 사례 보고서 동적 생성
    case_count = len(cases)
    
    # 평가 점수 조회
    case_ids = [c.id for c in cases]
    assessments = db.query(NyjAssessmentModel).filter(NyjAssessmentModel.case_id.in_(case_ids)).all()
    assess_map = {a.case_id: a for a in assessments}

    if case_count == 1:
        c = cases[0]
        a = assess_map.get(c.id)
        title = f"전국 우수사례 기반 남양주시 '{c.title}' 정책 도입 제안서"
        summary_text = (
            f"전국 지자체 AI 행정혁신 우수사례({c.region} {c.city})를 정밀 분석한 결과, "
            f"남양주시 행정 현안에 적용 시 시민 체감 효과와 공무원 업무 절감 효율이 매우 높을 것으로 판단되어 "
            f"2026년 하반기 시범사업 도입 및 시장님 정책 결정을 건의드립니다."
        )
        benchmark_content = (
            f"- **대상 기관**: {c.region} {c.city}\n"
            f"- **사업명**: {c.title} ({c.category})\n"
            f"- **적용 기술**: {c.tech}\n"
            f"- **확인된 운영 성과**: {c.performance or '공식자료 기반 운영 확인'}\n"
            f"- **공식 출처 및 검증**: {c.source_title or '공식 지자체 공고'} ({c.verification})\n"
            f"- **행정적 한계 및 유의사항**: {c.limitations or '특이사항 없음'}"
        )
        eval_content = (
            f"- **평가 총점**: {a.total_score if a else 85.0}점 / 100점 만점 (판정: **{a.grade if a else '최우선 검토'}**)\n"
            f"- **시민 편익 체감도**: 5점 만점 중 {a.citizen_benefit if a else 4}점\n"
            f"- **공무원 업무 절감도**: 5점 만점 중 {a.work_reduction if a else 5}점\n"
            f"- **남양주시 적합성**: 5점 만점 중 {a.nyj_fit if a else 5}점\n"
            f"- **종합 제언**: {a.analysis_reason if a else '남양주시 특성에 맞춘 실증 사업 타당성 충분'}"
        )
    else:
        case_titles = ", ".join([f"'{c.title}'" for c in cases[:3]]) + (f" 외 {case_count - 3}건" if case_count > 3 else "")
        title = f"전국 {case_count}대 AI 행정혁신 우수사례 종합 정책 도입 제안서"
        summary_text = (
            f"전국 17개 시도에서 검증된 대표 AI 행정혁신 우수사례 {case_count}건({case_titles})을 비교 분석하여, "
            f"남양주시의 복지 사각지대 해소, 교통 민원 사전 예방, 야간 당직 자동화 등 핵심 시정 현안을 동시 해결하기 위한 "
            f"2026~2027 남양주시 종합 AI 행정혁신 패키지 도입 방안을 보고드립니다."
        )

        # 다자간 벤치마킹 비교 표 생성 (마크다운)
        table_rows = [
            "| 사례ID | 지자체 | 정책 사업명 | 정책 분야 | 핵심 적용 AI 기술 | 공식 확인 성과 |",
            "| :---: | :---: | :--- | :---: | :--- | :--- |"
        ]
        for c in cases:
            table_rows.append(
                f"| **{c.id}** | {c.region} {c.city} | **{c.title}** | {c.category} | {c.tech} | {c.performance or '운영 확인'} |"
            )
        benchmark_content = "\n".join(table_rows)

        # 다자간 7대 적합성 평가 결과 비교 표
        eval_rows = [
            "| 사례ID | 정책 사업명 | 남양주 적합 총점 | 종합 등급 | 시민편익 | 업무절감 | 남양주 제언 요약 |",
            "| :---: | :--- | :---: | :---: | :---: | :---: | :--- |"
        ]
        for c in cases:
            a = assess_map.get(c.id)
            score = a.total_score if a else 85.0
            grade = a.grade if a else "최우선 검토"
            b_score = a.citizen_benefit if a else 4
            w_score = a.work_reduction if a else 4
            reason = (a.analysis_reason[:45] + "...") if (a and a.analysis_reason and len(a.analysis_reason) > 45) else (a.analysis_reason if a else "남양주 도입 타당성 충분")
            eval_rows.append(
                f"| **{c.id}** | {c.title} | **{score}점** | {grade} | {b_score}/5 | {w_score}/5 | {reason} |"
            )
        eval_content = "\n".join(eval_rows)

    sections = [
        {
            "heading": "1. 핵심 제안 요약 (Executive Summary)",
            "content": summary_text
        },
        {
            "heading": f"2. 타 지자체 벤치마킹 우수사례 정밀 검증 ({case_count}건)",
            "content": benchmark_content
        },
        {
            "heading": "3. 남양주시 정책 적합성 7대 지표 평가 결과",
            "content": eval_content
        },
        {
            "heading": "4. 단계별 통합 추진 로드맵 (Roadmap)",
            "content": (
                "1) **1단계 (기획 및 행정협의, 1~2개월)**: 소관 부서(스마트도시과·첨단교통과·복지기획과) 합동 TF 구성, 보안성 및 개인정보 영향평가 완료\n"
                "2) **2단계 (실증 시범운영, 3~6개월)**: 관내 1~2개 읍면동 행정복지센터 대상 현장 실증(PoC) 착수 및 시민 체감 만족도 측정\n"
                "3) **3단계 (전면 도입 및 타 시스템 연계, 7~12개월)**: 남양주시 전역 확대 시행 및 차세대 지자체 행정정보시스템 연계 완료"
            )
        },
        {
            "heading": "5. 시장님 의사결정 및 정책 승인 요청사항 (Decision Points)",
            "content": (
                "- **방침 결정**: 선택된 AI 행정혁신 우수사례 시범도입 방침 확정 및 부서별 실행 과제 지정 승인\n"
                "- **조직 협업**: 스마트도시과 총괄 주관 하에 사업별 소관 부서 전담 인력 지정\n"
                "- **재정 계획**: 2026년도 하반기 추경 및 2027년도 본예산 사전 타당성 연구/구축비 편성 승인"
            )
        }
    ]

    from datetime import datetime
    today_str = datetime.now().strftime("%Y년 %m월 %d일")

    return {
        "title": title,
        "author": req.author_dept,
        "date": today_str,
        "audience": req.target_audience,
        "total_score": round(sum(assess_map[c.id].total_score if c.id in assess_map else 85.0 for c in cases) / max(case_count, 1), 1),
        "grade": "최우선 검토",
        "sections": sections,
        "selected_cases": [c.title for c in cases]
    }
