# 🏛️ 전국 지자체 AI 행정혁신 정책연구 플랫폼 (v2.0.0)

> **연구 주관**: 남양주시 스마트 행정혁신 연구동아리  
> **연구 목적**: 전국 17개 광역·기초 지자체의 AI 도입 혁신사례(28건) 및 실증 출처(33건)를 체계적으로 분석하여 남양주시 맞춤형 AI 행정 모델을 발굴·적용하기 위한 정책 연구 플랫폼

---

## 🌟 주요 기능

1. **📊 17개 시도 지자체 AI 혁신사례 대시보드**
   - 28건의 상세 추진 사례 및 19건의 원문 시행확인 독립사업 데이터베이스
   - 8대 정책분야(복지·안전·교통·민원·행정지원 등)별 도입 현황 및 공백(Gap) 심층 분석
2. **⚖️ 다자간 사례 비교 & 적합성 평가 (Assessment)**
   - 도입 효과성, 기술 성숙도, 예산 적합성, 시민 체감도 평가 지표 제공
3. **🤖 초고속 정책 자문 AI (Groq LPU 기반)**
   - 전국 우수사례 기반 실시간 질의응답 및 정책 브리핑 생성
4. **📄 공공 표준 서식 다운로드**
   - 한글 표준(`.hwpx`) 및 MS Word(`.docx`) 정책 기안문 자동 생성 및 내보내기

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite, Lucide Icons, Modern Responsive Design
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy (ORM), Pydantic v2, Uvicorn
- **Database**: SQLite (개발/테스트) / Supabase PostgreSQL (프로덕션 확장용)
- **AI Engine**: Groq 초고속 LPU (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`)

---

## 🚀 빠른 시작 가이드 (Getting Started)

### 1. 저장소 복제 (Clone)
```bash
git clone https://github.com/nyj-worker/ai_case.git
cd ai_case
```

---

### 2. 백엔드 (FastAPI) 실행 방법

#### (1) 백엔드 폴더로 이동 및 패키지 설치
```bash
cd services/api

# 파이썬 가상환경 생성 (선택 권장)
python -m venv .venv
# Windows 가상환경 활성화:
.venv\Scripts\activate
# Mac/Linux 가상환경 활성화:
source .venv/bin/activate

# 필수 패키지 설치
pip install -r requirements.txt
```

#### (2) 환경변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:
```bash
# Windows
copy .env.example .env
# Mac/Linux
cp .env.example .env
```
`.env` 파일을 열고 본인의 `GROQ_API_KEY`를 입력하세요.

#### (3) 백엔드 서버 구동
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
```
- 백엔드 API 서버: [http://127.0.0.1:8080](http://127.0.0.1:8080)
- 대화형 Swagger API 문서: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

---

### 3. 프론트엔드 (React + Vite) 실행 방법

새로운 터미널 창을 열고 아래 명령어를 실행합니다:

```bash
cd apps/web

# 의존성 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```
- 프론트엔드 접속 URL: **[http://localhost:5173](http://localhost:5173)**

---

## 📂 프로젝트 디렉토리 구조

```
ai_case/
├── README.md                       # 프로젝트 소개 및 실행 매뉴얼
├── aesop.md                        # 정책 연구 설계 및 분석 문서
├── ai-local-research-2026-10-17/   # 전국 17개 시도 지자체 검증 데이터셋 (CSV/JSON)
├── apps/
│   └── web/                        # React 19 기반 프론트엔드 웹 앱
│       ├── src/
│       │   ├── components/         # 대시보드, 통계 차트, AI 챗 UI 컴포넌트
│       │   ├── lib/api.ts          # 백엔드 REST API 연동 클라이언트
│       │   └── types/              # TypeScript 인터페이스 정의
│       └── package.json
├── services/
│   └── api/                        # FastAPI 기반 고성능 백엔드
│       ├── app/
│       │   ├── api/v1/             # 대시보드, 사례, 평가, AI 라우터
│       │   ├── core/config.py      # 환경변수 및 설정 로직
│       │   ├── db/                 # 데이터베이스 세션 및 ORM 모델
│       │   └── services/           # 시드 데이터 로더 및 HWPX/DOCX 생성기
│       ├── requirements.txt
│       └── .env.example
└── supabase/
    └── migrations/                 # PostgreSQL 데이터베이스 마이그레이션 SQL
```

---

## 🔒 보안 및 라이선스 안내
- 본 프로젝트는 보안 규칙을 엄격히 준수하며, API 키 및 데이터베이스 접속 정보는 `.gitignore`를 통해 철저히 격리 관리됩니다.
- 저작권: 남양주시 스마트 행정혁신 연구동아리 (모든 공공 행정 혁신 연구 목적으로 자유롭게 활용 가능합니다).
