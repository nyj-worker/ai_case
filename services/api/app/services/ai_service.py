"""
AI RAG 챗봇 및 정책 분석 에이전트 서비스 (services/ai_service.py)
Groq 초고속 LPU 추론 엔진 연동, xAI Grok 호환, 공식 출처 기반 검색 증강 생성(RAG)
"""

import httpx
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import mask_secret_key
from app.models.entities import CaseModel
from app.schemas.schemas import ChatMessage, ChatResponse, ChatSourceCitation


async def generate_policy_chat_response(
    message: str,
    history: List[ChatMessage],
    db: Session,
    category_filter: Optional[str] = None,
    region_filter: Optional[str] = None
) -> ChatResponse:
    """
    RAG 기반 질문 답변 처리 파이프라인
    1. 사용자 질문에서 핵심 검색 키워드 추출
    2. 데이터베이스에서 관련 정책 사례 및 공식 출처 검색
    3. 출처 근거(Citations) 및 인용구 선별
    4. Groq 초고속 LPU 엔진(llama-3.3-70b-versatile)을 호출하여 1초 이내 초고속 구조화 답변 생성
    5. 오류 발생 시 안전한 로컬 폴백 엔진으로 대체
    """
    # 1. 관련 사례 검색 (키워드 기반 RAG 매칭)
    keywords = [w.strip() for w in message.replace("?", "").replace("!", "").replace("는", "").replace("은", "").replace("을", "").replace("를", "").split() if len(w.strip()) >= 2]
    
    query = db.query(CaseModel)
    if category_filter:
        query = query.filter(CaseModel.category.contains(category_filter))
    if region_filter:
        query = query.filter(CaseModel.region.contains(region_filter))

    all_cases = query.all()
    
    # 키워드 매칭 점수 계산
    scored_cases = []
    for c in all_cases:
        score = 0
        content_to_search = f"{c.title} {c.region} {c.city} {c.category} {c.summary} {c.tech} {c.benefit} {c.performance}"
        for kw in keywords:
            if kw in content_to_search:
                score += 1
            if kw in c.title:
                score += 3  # 제목 매칭 가중치
            if kw in c.category:
                score += 2
        if score > 0 or not keywords:
            scored_cases.append((score, c))
            
    scored_cases.sort(key=lambda x: x[0], reverse=True)
    matched_cases = [item[1] for item in scored_cases[:5]]

    # 2. 인용구 및 공식 출처 메타데이터 추출
    citations: List[ChatSourceCitation] = []
    context_chunks = []
    for c in matched_cases:
        quote_text = None
        if c.evidences:
            quote_text = c.evidences[0].quote

        citation = ChatSourceCitation(
            case_id=c.id,
            title=c.title,
            region=f"{c.region} {c.city}",
            source_title=c.source_title or "공식 보도자료/공지",
            source_url=c.source_url,
            quote=quote_text
        )
        citations.append(citation)

        chunk = (
            f"[사례 {c.id}] {c.region} {c.city} - {c.title}\n"
            f"- 정책분야: {c.category} | 운영상태: {c.status} ({c.checked_at} 공식확인)\n"
            f"- 적용기술: {c.tech}\n"
            f"- 사업개요: {c.summary}\n"
            f"- 공식확인 성과: {c.performance}\n"
            f"- 행정적 한계/보수적 검토: {c.limitations or '특이사항 없음'}\n"
            f"- 공식출처: {c.source_title} ({c.source_url})\n"
        )
        context_chunks.append(chunk)

    context_str = "\n".join(context_chunks)

    # 3. Groq 초고속 LPU API 호출 (Groq API 키가 설정된 경우)
    if settings.GROQ_API_KEY:
        try:
            system_prompt = (
                "당신은 대한민국 지방행정 혁신 정책 전문가이자 남양주시 스마트 행정혁신 연구위원입니다.\n"
                "반드시 아래 제공된 '전국 지자체 2차 공식 검증 자료'에 근거하여 전문적이고 논리정연하게 답변하세요.\n"
                "자료에 없는 수치, 사업비, 성과는 임의로 지어내지 말고 '공식자료에서 확인되지 않음'으로 솔직히 명시하세요.\n"
                "답변 마지막에는 항상 [남양주시 정책 적용 시사점 및 제언]을 포함하세요.\n\n"
                f"=== 공식 검증 자료 ===\n{context_str}"
            )

            # 이전 대화 기록 구성
            messages = [{"role": "system", "content": system_prompt}]
            for h in history[-4:]:  # 최근 4개 메시지 컨텍스트 유지
                messages.append({"role": h.role, "content": h.content})
            messages.append({"role": "user", "content": message})

            # Groq API 초고속 호출 (평균 0.5~1초 응답)
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.GROQ_MODEL,
                        "messages": messages,
                        "temperature": 0.2,
                        "max_tokens": 1500
                    }
                )

                if res.status_code == 200:
                    api_data = res.json()
                    answer_text = api_data["choices"][0]["message"]["content"]
                    masked_key = mask_secret_key(settings.GROQ_API_KEY)
                    return ChatResponse(
                        answer=answer_text,
                        citations=citations,
                        model=f"Groq {settings.GROQ_MODEL} (LPU Ultra-Fast)",
                        confidence=f"공식 2차 조사 검증자료 기반 (Key: {masked_key})"
                    )
                else:
                    print(f"[AIService] Groq API 응답 에러 (Status {res.status_code}): {res.text}")
        except Exception as e:
            print(f"[AIService] Groq API 호출 예외 발생, 로컬 엔진으로 대체: {e}")

    # 4. 외부 API 키가 없거나 호출 실패 시 로컬 지능형 폴백 엔진 동작
    if not matched_cases:
        return ChatResponse(
            answer=(
                "현재 확보된 전국 지자체 2차 공식 조사 자료(26건) 내에서는 질문과 직접 관련된 사례를 찾을 수 없습니다.\n\n"
                "💡 **연구 제언:**\n"
                "- 상단 검색창에서 '복지', '주차', '민원', '당직', '교통', 'cctv' 등의 키워드로 질문해보시거나,\n"
                "- [17개 시도별 사례] 또는 [8대 정책분야] 탭에서 공식 문서 목록을 직접 확인하실 수 있습니다."
            ),
            citations=[],
            model="Local-Policy-Agent (Offline Fallback)",
            confidence="공식자료 범위 내 엄밀 검증"
        )

    # 로컬 고품질 정책 분석 리포트
    lines = [
        "전국 지자체 2차 공식 검증 자료를 바탕으로 분석한 정책 브리핑 결과입니다.\n"
    ]

    for idx, c in enumerate(matched_cases, 1):
        lines.append(f"### {idx}. [{c.region} {c.city}] {c.title}")
        lines.append(f"- **정책 분야:** {c.category} (상태: **{c.status}** / 조사일: {c.checked_at})")
        lines.append(f"- **적용 기술:** {c.tech}")
        lines.append(f"- **주요 내용:** {c.summary}")
        lines.append(f"- **공식 확인 성과:** {c.performance}")
        if c.limitations:
            lines.append(f"- **행정적 한계 및 유의사항:** {c.limitations}")
        lines.append(f"- **공식 출처:** [{c.source_title or '공식 원문'}]({c.source_url}) ({c.verification})\n")

    lines.append(
        "🏛️ **남양주시 정책 적용 시사점 및 제언:**\n"
        "- 상기 사례들은 남양주시 스마트시티과, 복지기획과, 주차관리과, 총무과 등 소관 부서의 현안과 밀접하게 연계될 수 있습니다.\n"
        "- 특히 검증 등급이 '원문 확인'된 사례를 우선으로 시범사업(PoC) 타당성을 검토할 것을 권장합니다."
    )

    return ChatResponse(
        answer="\n".join(lines),
        citations=citations,
        model="Local-RAG-Engine",
        confidence="2026-10-17 2차 공식 검증자료 기반"
    )
