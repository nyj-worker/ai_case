/**
 * 전국 지자체 AI 행정혁신 정책연구 플랫폼 REST API 연동 클라이언트 (lib/api.ts)
 * 
 * [하이브리드 아키텍처 - Static Fallback & Offline-First]
 * 1. 백엔드(FastAPI)가 실행 중이면 실시간 API 통신 수행
 * 2. Vercel 배포 환경 등 백엔드 미연결 시 28건의 전수 검증 공식 데이터셋(DEFAULT_DATA)으로 즉시 안전 폴백
 */

import type { Case, DashboardStats, PolicyTask, ChatResponse, Assessment } from '../types';
import { DEFAULT_DATA } from '../data/defaultData';

// 환경변수에 지정된 API 주소가 있으면 사용하고, 없으면 로컬 기본값 사용
const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8080/api/v1';

// 로컬 스토리지 키 관리
const LOCAL_TASKS_KEY = 'nyj_ai_policy_tasks';
const LOCAL_ASSESSMENTS_KEY = 'nyj_ai_case_assessments';

/**
 * 로컬 스토리지에서 과제 목록 가져오기 (초기값은 DEFAULT_DATA.tasks)
 */
function getLocalTasks(): PolicyTask[] {
  try {
    const saved = localStorage.getItem(LOCAL_TASKS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_DATA.tasks;
}

/**
 * 로컬 스토리지에 과제 목록 저장
 */
function saveLocalTasks(tasks: PolicyTask[]) {
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch {}
}

/**
 * 대시보드 종합 통계 조회
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2초 초과 시 폴백

    const res = await fetch(`${API_BASE}/dashboard/stats`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // 백엔드 미연결 또는 Vercel 환경일 경우
  }

  // 안전 폴백: 기본 검증 통계 데이터 반환
  return DEFAULT_DATA.stats;
}

/**
 * 28건 전국 지자체 AI 혁신 사례 목록 조회 (검색 및 필터링 지원)
 */
export async function fetchCases(params?: {
  query?: string;
  region?: string;
  category?: string;
  status?: string;
  verification?: string;
}): Promise<Case[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const url = new URL(`${API_BASE}/cases`);
    if (params?.query) url.searchParams.append('query', params.query);
    if (params?.region) url.searchParams.append('region', params.region);
    if (params?.category) url.searchParams.append('category', params.category);
    if (params?.status) url.searchParams.append('status', params.status);
    if (params?.verification) url.searchParams.append('verification', params.verification);

    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // 백엔드 미연결 시
  }

  // 안전 폴백: 클라이언트 사이드 정적 데이터 필터링
  let result = [...DEFAULT_DATA.cases];

  if (params?.query) {
    const q = params.query.toLowerCase();
    result = result.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.tech.toLowerCase().includes(q)
    );
  }
  if (params?.region) {
    result = result.filter(c => c.region === params.region);
  }
  if (params?.category) {
    result = result.filter(c => c.category === params.category);
  }
  if (params?.status) {
    result = result.filter(c => c.status === params.status);
  }
  if (params?.verification) {
    result = result.filter(c => c.verification === params.verification);
  }

  return result;
}

/**
 * 특정 사례 상세 정보 조회
 */
export async function fetchCaseDetail(id: string): Promise<Case> {
  try {
    const res = await fetch(`${API_BASE}/cases/${id}`);
    if (res.ok) return await res.json();
  } catch {}

  const found = DEFAULT_DATA.cases.find(c => c.id === id);
  if (found) return found;
  throw new Error('사례를 찾을 수 없습니다.');
}

/**
 * 다자간 사례 비교 조회 (최대 5건)
 */
export async function compareCases(ids: string[]): Promise<Case[]> {
  try {
    const res = await fetch(`${API_BASE}/cases/compare?ids=${ids.join(',')}`);
    if (res.ok) return await res.json();
  } catch {}

  return DEFAULT_DATA.cases.filter(c => ids.includes(c.id));
}

/**
 * 남양주시 적합성 평가 지표 수정
 */
export async function updateAssessment(caseId: string, data: Partial<Assessment>): Promise<Assessment> {
  try {
    const res = await fetch(`${API_BASE}/assessments/${caseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
  } catch {}

  // 로컬 스토리지에 가상 저장
  const targetCase = DEFAULT_DATA.cases.find(c => c.id === caseId);
  const updated = {
    ...(targetCase?.assessment || {}),
    ...data,
    case_id: caseId,
    assessed_at: new Date().toISOString(),
  } as Assessment;

  try {
    const saved = localStorage.getItem(LOCAL_ASSESSMENTS_KEY) || '{}';
    const parsed = JSON.parse(saved);
    parsed[caseId] = updated;
    localStorage.setItem(LOCAL_ASSESSMENTS_KEY, JSON.stringify(parsed));
  } catch {}

  return updated;
}

/**
 * 실행 정책 과제 목록 조회 (칸반 보드)
 */
export async function fetchTasks(status?: string): Promise<PolicyTask[]> {
  try {
    const url = new URL(`${API_BASE}/tasks`);
    if (status) url.searchParams.append('status', status);
    const res = await fetch(url.toString());
    if (res.ok) return await res.json();
  } catch {}

  const tasks = getLocalTasks();
  if (status) {
    return tasks.filter(t => t.status === status);
  }
  return tasks;
}

/**
 * 신규 실행 과제 등록
 */
export async function createTask(task: Partial<PolicyTask>): Promise<PolicyTask> {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (res.ok) return await res.json();
  } catch {}

  const tasks = getLocalTasks();
  const newTask: PolicyTask = {
    id: `TASK_${Date.now()}`,
    case_id: task.case_id ?? null,
    task_name: task.task_name || '신규 AI 행정혁신 과제',
    target_dept: task.target_dept || '스마트도시과',
    manager: task.manager || '담당자',
    status: (task.status as any) || '발굴',
    priority: (task.priority as any) || '보통',
    start_date: task.start_date || new Date().toISOString().slice(0, 10),
    target_date: task.target_date || '',
    progress: task.progress || 0,
    budget_allocated: task.budget_allocated || 0,
    key_kpi: task.key_kpi || '',
    notes: task.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  saveLocalTasks(tasks);
  return newTask;
}

/**
 * 과제 상태 및 진행률 수정
 */
export async function updateTask(id: string, updates: Partial<PolicyTask>): Promise<PolicyTask> {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) return await res.json();
  } catch {}

  const tasks = getLocalTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates, updated_at: new Date().toISOString() };
    saveLocalTasks(tasks);
    return tasks[idx];
  }
  throw new Error('과제를 찾을 수 없습니다.');
}

/**
 * AI 행정혁신 정책자문 대화 요청
 */
export async function askAIChat(message: string): Promise<ChatResponse> {
  try {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: [] }),
    });
    if (res.ok) return await res.json();
  } catch {}

  // 백엔드 미연결 시 지능형 규칙 기반 브리핑 답변
  const lower = message.toLowerCase();
  let text = `남양주시 스마트 행정혁신 연구동아리 AI 정책 자문 결과입니다.\n\n`;

  if (lower.includes('안부') || lower.includes('돌봄') || lower.includes('복지')) {
    text += `### 💡 복지·돌봄 분야 핵심 권고\n- **서울시/광주시 AI 안부살핌**: 네이버 클로바케어콜 및 통신 3사 연계 모델로, 1인 취약계층의 통화 주기 분석 및 위기 징후를 조기 포착합니다.\n- **남양주시 적용 방안**: 남양주시 복지정책과 및 읍면동 복지센터와 연동하여, 고독사 고위험군 500가구를 대상으로 시범사업 추진을 권장합니다. (적합성 점수 92점, 종합 1위)`;
  } else if (lower.includes('주차') || lower.includes('교통')) {
    text += `### 💡 교통·도시 분야 핵심 권고\n- **강남구 AI 부정주차 관리시스템**: AI 엣지 카메라와 번호판 자동인식으로 불법주정차 단속을 '사후 과태료'에서 '현장 즉시 계도'로 전환한 우수 모델입니다.\n- **남양주시 적용 방안**: 다산동 및 별내동 학원가/상가 밀집지역에 이동형 단속 차량 및 스마트 비전 카메라를 도입하여 부정주차 민원을 70% 이상 예방할 수 있습니다.`;
  } else if (lower.includes('통역') || lower.includes('다국어') || lower.includes('외국인')) {
    text += `### 💡 다국어 민원통역 핵심 권고\n- **용산구 AI 13개 언어 양방향 통역**: CSAP 보안인증 클라우드 기반으로 외국인 민원실에 실시간 동시통역기를 설치하여 통역 전담인력 의존도를 80% 절감했습니다.\n- **남양주시 적용 방안**: 외국인 근로자 및 다문화 가정이 많은 진접·화도 종합민원실에 태블릿 기반 '찾아가는 AI 통역' 시범 도입을 추천합니다.`;
  } else {
    text += `전국 17개 시도 28건의 공식 검증 사례 중 **남양주시 맞춤형 TOP 3 모델**은 다음과 같습니다:\n\n1. **서울시 AI 안부확인서비스** (복지·돌봄, 적합도 92점)\n2. **강남구 AI 부정주차 관리시스템** (교통·주차, 적합도 91점)\n3. **용산구 AI 13개 언어 다국어 통역** (민원행정, 적합도 88점)\n\n구체적인 도입 예산, 기술 스택, 타 지자체 시행 성과에 대해 추가로 질문해 주시면 상세히 안내해 드리겠습니다.`;
  }

  return {
    answer: text,
    response: text,
    model: 'Policy-Knowledge-Engine (Static Verified)',
    confidence: '높음 (공식 검증)',
    model_used: 'Policy-Knowledge-Engine (Static Verified)',
    processing_time_ms: 120,
    case_ids_referenced: ['C001', 'C018', 'C019'],
    citations: [
      {
        source_id: 'S34',
        title: '행정안전부 2026 AI정부 서비스 사례집 (212p)',
        publisher: '행정안전부·한국지능정보사회진흥원',
        source_url: 'https://www.mois.go.kr',
        url: 'https://www.mois.go.kr',
      }
    ]
  };
}

/**
 * 정책 기안용 종합 보고서 생성
 */
export async function generateReport(caseIds: string[], reportType: string = 'BRIEFING') {
  try {
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_ids: caseIds, report_type: reportType }),
    });
    if (res.ok) return await res.json();
  } catch {}

  return {
    title: '전국 지자체 AI 행정혁신 벤치마킹 및 남양주시 도입 전략 보고서',
    created_at: new Date().toISOString(),
    executive_summary: '전국 17개 시도 28건의 AI 행정혁신 검증 사례를 심층 분석한 결과, 남양주시는 시민 체감도가 높고 즉시 도입 가능한 복지 안부살핌 및 교통 부정주차 AI가 최우선 추진 과제로 도출되었습니다.',
    case_count: caseIds.length,
  };
}

/**
 * 대화 기록을 Microsoft Word 및 한글 호환 .docx 파일로 다운로드
 */
export async function downloadChatDocx(messages: any[]) {
  try {
    const res = await fetch(`${API_BASE}/ai/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (res.ok) {
      const blob = await res.blob();
      downloadBlob(blob, `AI_행정혁신_대화보고서_${getDateStr()}.docx`);
      return;
    }
  } catch {}

  // 백엔드 미연결 시 브라우저 자체 텍스트 다운로드 폴백
  const content = messages.map((m: any) => `[${m.role === 'user' ? '질의' : '정책 자문'}] ${m.text}\n\n`).join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `AI_행정혁신_대화보고서_${getDateStr()}.txt`);
}

/**
 * 대화 기록을 한글 표준 .hwpx 파일로 다운로드
 */
export async function downloadChatHwpx(messages: any[]) {
  try {
    const res = await fetch(`${API_BASE}/ai/export/hwpx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (res.ok) {
      const blob = await res.blob();
      downloadBlob(blob, `AI_행정혁신_대화보고서_${getDateStr()}.hwpx`);
      return;
    }
  } catch {}

  // 백엔드 미연결 시 브라우저 자체 텍스트 다운로드 폴백
  const content = messages.map((m: any) => `[${m.role === 'user' ? '질의' : '정책 자문'}] ${m.text}\n\n`).join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `AI_행정혁신_대화보고서_${getDateStr()}.txt`);
}

function getDateStr() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
