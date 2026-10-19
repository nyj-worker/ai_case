-- ==============================================================================
-- 001_initial_schema.sql
-- 전국 지자체 AI 행정혁신 정책연구 플랫폼 초기 데이터베이스 스키마
-- 작성일: 2026-10-17
-- 설명: 17개 시도 행정구역, AI 혁신사례(26개 검증 표본), 공식 출처, 증거 인용,
--       남양주시 정책 적합성 평가 및 추진 과제 관리를 위한 통합 정규화 스키마
-- ==============================================================================

-- 1. 지역 테이블 (전국 17개 광역시도 및 기초 시군구)
CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(20) PRIMARY KEY,           -- 행정구역 코드 또는 식별자 (예: REG_11_SEOUL)
    name VARCHAR(100) NOT NULL,          -- 지역명 (예: 서울특별시, 남양주시)
    type VARCHAR(20) NOT NULL,           -- 광역 / 기초 / 특별자치
    parent_id VARCHAR(20) REFERENCES regions(id) ON DELETE SET NULL, -- 상위 광역 지자체 ID
    is_active BOOLEAN DEFAULT TRUE,      -- 활성 여부
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 정책 분야 테이블 (다중 태그 분류 체계)
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,          -- 분야 ID (예: WELFARE, CITIZEN, TRAFFIC 등)
    name VARCHAR(100) NOT NULL,          -- 분야명 (예: 복지·돌봄, 민원·시민서비스)
    description TEXT,                    -- 분야 설명
    sort_order INT DEFAULT 0             -- 정렬 순서
);

-- 3. AI 혁신사례 테이블 (핵심 사례 엔터티)
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(20) PRIMARY KEY,          -- 사례 고유번호 (예: C001, C002 ...)
    title VARCHAR(200) NOT NULL,         -- 정책 사업명
    region VARCHAR(50) NOT NULL,         -- 광역시도명 (예: 서울특별시, 경기도)
    city VARCHAR(100) NOT NULL,          -- 기초지자체명 또는 '광역'
    category VARCHAR(100) NOT NULL,      -- 주 분류 (예: 복지·돌봄)
    status VARCHAR(30) NOT NULL,         -- 운영 / 시범운영 / 기획 / 미확인
    summary TEXT NOT NULL,               -- 사업 개요 및 주요 내용
    tech VARCHAR(200) NOT NULL,          -- 활용된 AI 기술 (예: 대화형 AI, LLM, 컴퓨터 비전)
    benefit TEXT,                        -- 시민 편익 및 기대효과
    performance TEXT DEFAULT '미확인',    -- 정량적/정성적 성과 (미확인 시 '미확인')
    performance_verification VARCHAR(100) DEFAULT '미확인', -- 성과 검증 상태
    source_url TEXT NOT NULL,            -- 대표 공식 원문 URL
    source_title TEXT,                   -- 출처 문서명
    published_at VARCHAR(30),            -- 최초 발표일 또는 확인일
    checked_at VARCHAR(30) NOT NULL,     -- 조사 확인일 (예: 2026-10-17)
    status_as_of VARCHAR(30),            -- 출처 당시 상태 기준일
    current_status VARCHAR(30) DEFAULT '미확인', -- 현재 지속운영 여부 (재검증 전까지 미확인)
    verification VARCHAR(50) NOT NULL,   -- 원문 확인 / 원문 교차확인 / 색인 확인·재검증 필요 / 문헌 수록 확인
    implementation_evidence BOOLEAN DEFAULT FALSE, -- 실제 시행 사실 자료 존재 여부
    budget VARCHAR(100) DEFAULT '미확인', -- 사업 예산 (구축비/운영비)
    limitations TEXT,                    -- 한계점, 유의사항 및 보수적 평가 메타데이터
    parent_case_id VARCHAR(20),          -- 상위 사업 ID (동일 도 사업 안내 등 중복 매핑 시)
    record_type VARCHAR(50) DEFAULT '독립 사업', -- 독립 사업 / 지역 접수 안내 / 공식 목차 수록 등
    is_demo BOOLEAN DEFAULT FALSE,       -- 데모/샘플 데이터 여부
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 공식 출처 테이블 (1~3순위 공공기관 공식 자료)
CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(20) PRIMARY KEY,          -- 출처 ID (예: S01, S02 ...)
    title VARCHAR(300) NOT NULL,         -- 공식 문서/공지명
    publisher VARCHAR(100) NOT NULL,     -- 발행 기관 (예: 서울특별시, 행정안전부, 춘천시의회)
    published_at VARCHAR(30),            -- 발행일자
    url TEXT NOT NULL,                   -- 원문 링크
    checked_at VARCHAR(30) NOT NULL,     -- 원문 대조 확인일
    access_status VARCHAR(100) NOT NULL, -- 원문 텍스트 확인 / 검색 색인 확인 / 원문 접속 실패 등
    role VARCHAR(50) DEFAULT '개별 사례 근거', -- 근거 역할
    locator TEXT,                        -- 문서 내 구체적 위치 (예: 본문 3문단, 별첨 1 등)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 사례-출처 연결 테이블 (M:N 관계)
CREATE TABLE IF NOT EXISTS case_sources (
    case_id VARCHAR(20) REFERENCES cases(id) ON DELETE CASCADE,
    source_id VARCHAR(20) REFERENCES sources(id) ON DELETE CASCADE,
    PRIMARY KEY (case_id, source_id)
);

-- 6. 개별 사실 주장 및 원문 근거 인용구 테이블 (Evidence Claims)
CREATE TABLE IF NOT EXISTS evidence_claims (
    id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(20) REFERENCES cases(id) ON DELETE CASCADE,
    source_id VARCHAR(20) REFERENCES sources(id) ON DELETE CASCADE,
    claim VARCHAR(200) NOT NULL,         -- 주장 내용 (예: 시행 및 기능, 성과 등)
    quote TEXT NOT NULL,                 -- 원문에서 직접 발췌한 인용구
    locator TEXT,                        -- 본문 내 위치
    supports_performance BOOLEAN DEFAULT FALSE, -- 성과를 직접 뒷받침하는지 여부
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 남양주시 정책 적합성 평가 테이블 (7대 기준 100점 만점 엔진)
CREATE TABLE IF NOT EXISTS nyj_assessments (
    id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(20) REFERENCES cases(id) ON DELETE CASCADE,
    citizen_benefit INT NOT NULL CHECK (citizen_benefit BETWEEN 0 AND 5),   -- 시민 편익 및 체감 효과 (가중치 20%)
    work_reduction INT NOT NULL CHECK (work_reduction BETWEEN 0 AND 5),     -- 공무원 업무시간 절감 (가중치 20%)
    nyj_fit INT NOT NULL CHECK (nyj_fit BETWEEN 0 AND 5),                   -- 남양주시 행정수요 적합성 (가중치 15%)
    cost_efficiency INT NOT NULL CHECK (cost_efficiency BETWEEN 0 AND 5),   -- 예산 및 비용 효율성 (가중치 15%)
    tech_feasibility INT NOT NULL CHECK (tech_feasibility BETWEEN 0 AND 5), -- 기술 구현 가능성 (가중치 10%)
    legal_safety INT NOT NULL CHECK (legal_safety BETWEEN 0 AND 5),         -- 개인정보·법적·보안 적합성 (가중치 10%)
    org_acceptability INT NOT NULL CHECK (org_acceptability BETWEEN 0 AND 5),-- 조직 수용성 및 확산성 (가중치 10%)
    total_score DECIMAL(5,2) NOT NULL,                                      -- 총점 (0.00 ~ 100.00)
    grade VARCHAR(30) NOT NULL,                                             -- 최우선 검토 / 우선 검토 / 중장기 검토 / 추가 검토 필요
    analysis_reason TEXT,                                                   -- 구체적 평가 사유 및 AI/전문가 의견
    is_approved BOOLEAN DEFAULT FALSE,                                      -- 담당자 승인 여부
    assessed_by VARCHAR(50) DEFAULT '남양주시 스마트 행정혁신 연구동아리',
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 남양주시 정책 실행 과제 테이블 (칸반 및 성과 로드맵)
CREATE TABLE IF NOT EXISTS policy_tasks (
    id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(20) REFERENCES cases(id) ON DELETE SET NULL,
    task_name VARCHAR(200) NOT NULL,     -- 추진 과제명
    target_dept VARCHAR(100) NOT NULL,   -- 담당 부서 (예: 첨단교통과, 복지행정과, 총무과 등)
    manager VARCHAR(50),                 -- 담당자
    status VARCHAR(30) NOT NULL DEFAULT '발굴', -- 발굴 / 검토 / 타당성조사 / 시범사업준비 / 시범운영 / 정식운영 / 보류
    priority VARCHAR(20) DEFAULT '보통', -- 최우선 / 높음 / 보통 / 검토중
    start_date DATE,
    target_date DATE,
    progress INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100), -- 진행률 %
    budget_allocated BIGINT DEFAULT 0,  -- 배정 예산(원)
    key_kpi TEXT,                        -- 핵심 성과지표
    notes TEXT,                          -- 비고 및 추진 현황
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 사용자 및 보안 권한 테이블 (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- 안전한 암호화 해시 저장
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    role VARCHAR(30) NOT NULL DEFAULT 'PUBLIC', -- PUBLIC, RESEARCHER, STAFF, REVIEWER, ADMIN
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. 시스템 감사 로그 (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(50),
    target_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (검색 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_cases_region ON cases(region);
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_verification ON cases(verification);
CREATE INDEX IF NOT EXISTS idx_nyj_assessments_grade ON nyj_assessments(grade);
CREATE INDEX IF NOT EXISTS idx_policy_tasks_status ON policy_tasks(status);
