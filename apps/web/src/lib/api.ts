/**
 * 백엔드 REST API 연동 클라이언트 (lib/api.ts)
 */

import type { Case, DashboardStats, PolicyTask, ChatResponse, Assessment } from '../types';

const API_BASE = 'http://127.0.0.1:8080/api/v1';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('대시보드 통계 조회 실패');
  return res.json();
}

export async function fetchCases(params?: {
  query?: string;
  region?: string;
  category?: string;
  status?: string;
  verification?: string;
}): Promise<Case[]> {
  const url = new URL(`${API_BASE}/cases`);
  if (params?.query) url.searchParams.append('query', params.query);
  if (params?.region) url.searchParams.append('region', params.region);
  if (params?.category) url.searchParams.append('category', params.category);
  if (params?.status) url.searchParams.append('status', params.status);
  if (params?.verification) url.searchParams.append('verification', params.verification);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('사례 목록 조회 실패');
  return res.json();
}

export async function fetchCaseDetail(id: string): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases/${id}`);
  if (!res.ok) throw new Error('사례 상세 조회 실패');
  return res.json();
}

export async function compareCases(ids: string[]): Promise<Case[]> {
  const res = await fetch(`${API_BASE}/cases/compare?ids=${ids.join(',')}`);
  if (!res.ok) throw new Error('사례 비교 조회 실패');
  return res.json();
}

export async function updateAssessment(caseId: string, data: Partial<Assessment>): Promise<Assessment> {
  const res = await fetch(`${API_BASE}/assessments/${caseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('평가 업데이트 실패');
  return res.json();
}

export async function fetchTasks(status?: string): Promise<PolicyTask[]> {
  const url = new URL(`${API_BASE}/tasks`);
  if (status) url.searchParams.append('status', status);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('실행 과제 조회 실패');
  return res.json();
}

export async function createTask(task: Partial<PolicyTask>): Promise<PolicyTask> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('과제 생성 실패');
  return res.json();
}

export async function updateTask(id: string, task: Partial<PolicyTask>): Promise<PolicyTask> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('과제 수정 실패');
  return res.json();
}

export async function askAIChat(message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: [] }),
  });
  if (!res.ok) throw new Error('AI 대화 요청 실패');
  return res.json();
}

export async function generateReport(caseIds: string[], reportType: string = 'BRIEFING') {
  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case_ids: caseIds, report_type: reportType }),
  });
  if (!res.ok) throw new Error('보고서 생성 실패');
  return res.json();
}

/**
 * 대화 기록을 Microsoft Word 및 한글 호환 .docx 파일로 다운로드합니다.
 */
export async function downloadChatDocx(messages: any[]) {
  const res = await fetch(`${API_BASE}/ai/export/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error('DOCX 파일 생성 실패');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = url;
  a.download = `AI_행정혁신_대화보고서_${dateStr}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * 대화 기록을 한글 표준 .hwpx 파일로 다운로드합니다.
 */
export async function downloadChatHwpx(messages: any[]) {
  const res = await fetch(`${API_BASE}/ai/export/hwpx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error('HWPX 파일 생성 실패');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = url;
  a.download = `AI_행정혁신_대화보고서_${dateStr}.hwpx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
