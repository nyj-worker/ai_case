/**
 * 전국 지자체 AI 행정혁신 정책연구 플랫폼 (App.tsx)
 * 디자인 시스템: 이솝(Aesop) 아포테카리 감성 및 사려 깊은 편집 미학 (Vanilla CSS)
 * 운영 주체: 남양주시 스마트 행정혁신 연구동아리
 */

import React, { useState, useEffect } from 'react';
import {
  Search, ShieldCheck, MapPin, Layers, Scale, Sparkles,
  Kanban, FileText, ExternalLink, RefreshCw, X, ChevronRight, BarChart3, Bookmark,
  Send, Bot, Printer, Copy, Check, Download, RotateCcw, Plus
} from 'lucide-react';
import type { Case, DashboardStats, PolicyTask } from './types';
import * as api from './lib/api';
import MarkdownRenderer from './components/MarkdownRenderer';

export default function App() {
  // 현재 활성화된 탭
  const [activeTab, setActiveTab] = useState<'dashboard' | 'regions' | 'categories' | 'compare' | 'chat' | 'kanban' | 'reports'>('dashboard');

  // 데이터 상태
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // 비교 분석 대상 목록 (최대 5개)
  const [compareIds, setCompareIds] = useState<string[]>(['C018', 'C027', 'C020']);
  const [comparedCases, setComparedCases] = useState<Case[]>([]);

  // 칸반 과제 상태
  const [tasks, setTasks] = useState<PolicyTask[]>([]);

  // 과제 등록 멀티모달 상태 및 폼 필드
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    task_name: '',
    target_dept: '스마트도시과',
    manager: '',
    case_id: '',
    status: '발굴',
    priority: '보통',
    progress: 10,
    budget_allocated: 0,
    key_kpi: '',
    target_date: '',
    notes: '',
  });

  // 기본 AI 환영 메시지
  const INITIAL_CHAT_MESSAGE = {
    role: 'assistant' as const,
    text: '안녕하십니까. 남양주시 스마트 행정혁신 정책연구 AI 어시스턴트입니다.\n전국 17개 시도의 2차 공식 검증자료(28건의 사례, 34건의 공식 출처 및 행안부·NIA AI 정부서비스 사례집)를 기반으로 질문에 신뢰성 있게 답변드립니다.',
  };

  // AI 챗봇 상태 (localStorage 연동으로 새로고침해도 유지)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; citations?: any[] }>>(() => {
    try {
      const saved = localStorage.getItem('nyj_ai_chat_history');
      return saved ? JSON.parse(saved) : [INITIAL_CHAT_MESSAGE];
    } catch {
      return [INITIAL_CHAT_MESSAGE];
    }
  });
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatExported, setChatExported] = useState(false);
  const [chatCopied, setChatCopied] = useState(false);

  // 대화 변경 시 localStorage 자동 보존
  useEffect(() => {
    try {
      localStorage.setItem('nyj_ai_chat_history', JSON.stringify(chatMessages));
    } catch {}
  }, [chatMessages]);

  // 1. 대화내용을 한글 표준 .hwpx 파일로 다운로드
  const handleDownloadHwpx = async () => {
    try {
      setChatExported(true);
      await api.downloadChatHwpx(chatMessages);
      setTimeout(() => setChatExported(false), 2000);
    } catch (err) {
      alert('HWPX 파일 생성 중 오류가 발생했습니다.');
      setChatExported(false);
    }
  };

  // 2. 대화내용을 Microsoft Word 및 한글 호환 .docx 파일로 다운로드
  const handleDownloadDocx = async () => {
    try {
      setChatExported(true);
      await api.downloadChatDocx(chatMessages);
      setTimeout(() => setChatExported(false), 2000);
    } catch (err) {
      alert('DOCX 파일 생성 중 오류가 발생했습니다.');
      setChatExported(false);
    }
  };

  // 3. 한글(HWP) 및 워드(DOCX)에 Ctrl+V 시 표와 서식이 그대로 붙여넣어지는 서식 복사
  const handleCopyFormattedChat = async () => {
    let plainText = '=== 전국 지자체 AI 행정혁신 정책자문 대화 보고서 ===\n\n';
    let htmlContent = `<div style="font-family:'Malgun Gothic', '맑은 고딕', sans-serif; font-size:11pt; line-height:1.6; color:#222;">`;
    htmlContent += `<h2 style="color:#A6773B; border-bottom:2px solid #A6773B; padding-bottom:6px; font-family:'Malgun Gothic', '맑은 고딕';">전국 지자체 AI 행정혁신 정책자문 대화 보고서</h2>`;
    htmlContent += `<p style="font-size:9.5pt; color:#666;">작성일시: ${new Date().toLocaleString('ko-KR')} | 운영: 남양주시 스마트 행정혁신 연구동아리 | 데이터: 전국 17개 시도 28건 사례</p><hr style="border:0; border-top:1px solid #ddd; margin:16px 0;"/>`;

    chatMessages.forEach((msg, idx) => {
      const isUser = msg.role === 'user';
      const senderTitle = isUser ? `■ 질의 [${idx + 1}]` : `□ 정책 자문 분석 의견`;
      const titleColor = isUser ? '#A6773B' : '#6E7256';

      plainText += `[${senderTitle}]\n${msg.text}\n\n`;

      htmlContent += `<div style="margin-bottom:22px;">`;
      htmlContent += `<h3 style="color:${titleColor}; font-size:12pt; margin-bottom:8px; font-weight:bold;">${senderTitle}</h3>`;

      if (isUser) {
        htmlContent += `<div style="background-color:#F8F8F8; border-left:4px solid #A6773B; padding:10px 14px; font-weight:bold; font-size:11pt;">${msg.text}</div>`;
      } else {
        // 마크다운 표 및 문단을 한글/워드가 완벽 인식하는 HTML 테이블로 변환
        const lines = msg.text.split('\n');
        let inTable = false;
        let tableHtml = '';

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
            const isSep = trimmed.replace(/[\s|:\-]/g, '').length === 0;

            if (!inTable) {
              inTable = true;
              tableHtml = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; width:100%; border:1px solid #ccc; font-size:10pt; margin:12px 0;"><thead><tr style="background-color:#F3EFE7; font-weight:bold;">`;
              cells.forEach((c) => {
                tableHtml += `<th style="border:1px solid #ccc; padding:8px 10px; text-align:left; background-color:#F3EFE7;">${c}</th>`;
              });
              tableHtml += `</tr></thead><tbody>`;
            } else if (!isSep) {
              tableHtml += `<tr>`;
              cells.forEach((c) => {
                const cleanC = c.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
                tableHtml += `<td style="border:1px solid #ccc; padding:8px 10px;">${cleanC}</td>`;
              });
              tableHtml += `</tr>`;
            }
          } else {
            if (inTable) {
              inTable = false;
              tableHtml += `</tbody></table>`;
              htmlContent += tableHtml;
              tableHtml = '';
            }
            if (trimmed.startsWith('### ')) {
              htmlContent += `<h4 style="color:#222; font-size:11pt; margin-top:14px; margin-bottom:4px; font-weight:bold;">${trimmed.substring(4)}</h4>`;
            } else if (trimmed.startsWith('## ')) {
              htmlContent += `<h3 style="color:#222; font-size:12pt; margin-top:16px; margin-bottom:6px; font-weight:bold;">${trimmed.substring(3)}</h3>`;
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              const itemText = trimmed.substring(2).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
              htmlContent += `<p style="margin:4px 0 4px 14px;">• ${itemText}</p>`;
            } else if (trimmed) {
              const pText = trimmed.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
              htmlContent += `<p style="margin:6px 0;">${pText}</p>`;
            }
          }
        });

        if (inTable) {
          tableHtml += `</tbody></table>`;
          htmlContent += tableHtml;
        }

        if (msg.citations && msg.citations.length > 0) {
          htmlContent += `<div style="background-color:#FAFAFA; border:1px solid #E6D9C5; border-radius:4px; padding:10px 14px; margin-top:12px; font-size:9.5pt;">`;
          htmlContent += `<div style="font-weight:bold; color:#A6773B; margin-bottom:6px;">※ 공식 검증 출처 원문:</div>`;
          msg.citations.forEach((c: any) => {
            htmlContent += `<div style="margin-bottom:4px;">• <b>[${c.case_id}] ${c.title}</b> (${c.region}) : <a href="${c.source_url}" target="_blank" style="color:#A6773B; text-decoration:underline;">${c.source_title}</a></div>`;
          });
          htmlContent += `</div>`;
        }
      }

      htmlContent += `</div>`;
    });

    htmlContent += `</div>`;

    try {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        })
      ]);
      setChatCopied(true);
      setTimeout(() => setChatCopied(false), 2000);
    } catch (e) {
      // Fallback
      navigator.clipboard.writeText(plainText);
      setChatCopied(true);
      setTimeout(() => setChatCopied(false), 2000);
    }
  };

  // 4. 대화내용 초기화
  const handleResetChat = () => {
    if (window.confirm('현재까지의 AI 대화 기록을 모두 초기화하시겠습니까?')) {
      setChatMessages([INITIAL_CHAT_MESSAGE]);
      try {
        localStorage.removeItem('nyj_ai_chat_history');
      } catch {}
    }
  };

  // 보고서 생성 상태
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 공식 출처 URL 복사 상태
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  const handleCopyUrl = (url: string, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 2000);
  };

  // 즐겨찾기 상태 (localStorage 연동)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nyj_ai_favs');
      return saved ? JSON.parse(saved) : ['C024', 'C019'];
    } catch {
      return ['C024', 'C019'];
    }
  });

  const toggleFavorite = (id: string) => {
    const updated = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(updated);
    try {
      localStorage.setItem('nyj_ai_favs', JSON.stringify(updated));
    } catch {}
  };

  // 초기 데이터 로딩
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [statsData, casesData, tasksData] = await Promise.all([
        api.fetchDashboardStats(),
        api.fetchCases(),
        api.fetchTasks()
      ]);
      setStats(statsData);
      setCases(casesData);
      setTasks(tasksData);
    } catch (err) {
      console.error('초기 데이터 로딩 오류:', err);
    }
  };

  // 비교 분석 사례 로딩
  useEffect(() => {
    if (compareIds.length > 0) {
      api.compareCases(compareIds)
        .then(res => setComparedCases(res))
        .catch(err => console.error('비교 데이터 로딩 실패:', err));
    } else {
      setComparedCases([]);
    }
  }, [compareIds]);

  // 필터링된 사례 목록
  const filteredCases = cases.filter(c => {
    const matchQuery = !searchQuery || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tech.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRegion = !selectedRegion || c.region === selectedRegion;
    const matchCategory = !selectedCategory || c.category === selectedCategory;
    const matchStatus = !selectedStatus || c.status === selectedStatus;
    return matchQuery && matchRegion && matchCategory && matchStatus;
  });

  // AI 질의 전송
  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const newMsgs = [...chatMessages, { role: 'user' as const, text: textToSend }];
    setChatMessages(newMsgs);
    if (!presetText) setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.askAIChat(textToSend);
      setChatMessages([...newMsgs, { role: 'assistant', text: res.answer, citations: res.citations }]);
    } catch (err) {
      setChatMessages([
        ...newMsgs,
        { role: 'assistant', text: '일시적인 서버 통신 오류가 발생했습니다. 백엔드 상태를 확인해주세요.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // 보고서 자동 생성
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const targetIds = compareIds.length > 0 ? compareIds : ['C018', 'C027'];
      const report = await api.generateReport(targetIds, 'BRIEFING');
      setGeneratedReport(report);
    } catch (err) {
      alert('보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setReportLoading(false);
    }
  };

  // 칸반 과제 멀티모달 등록 처리
  const handleCreateTaskFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.task_name.trim()) {
      alert('과제명을 반드시 입력해주세요.');
      return;
    }
    try {
      const created = await api.createTask({
        task_name: taskForm.task_name,
        target_dept: taskForm.target_dept,
        manager: taskForm.manager || '담당자 미정',
        case_id: taskForm.case_id || undefined,
        status: taskForm.status,
        priority: taskForm.priority,
        progress: Number(taskForm.progress) || 10,
        budget_allocated: Number(taskForm.budget_allocated) || 0,
        key_kpi: taskForm.key_kpi || undefined,
        target_date: taskForm.target_date || undefined,
        notes: taskForm.notes || undefined,
      });
      setTasks([created, ...tasks]);
      setIsTaskModalOpen(false);
      // 폼 초기화
      setTaskForm({
        task_name: '',
        target_dept: '스마트도시과',
        manager: '',
        case_id: '',
        status: '발굴',
        priority: '보통',
        progress: 10,
        budget_allocated: 0,
        key_kpi: '',
        target_date: '',
        notes: '',
      });
    } catch (err) {
      alert('과제 등록에 실패했습니다. 백엔드 연결 상태를 확인해주세요.');
    }
  };

  // 칸반 과제 상태 변경
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updated = await api.updateTask(taskId, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? updated : t));
    } catch (err) {
      alert('상태 변경 실패');
    }
  };

  // 17개 공식 시도 목록
  const REGIONS = [
    '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
    '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
    '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도',
    '경상남도', '제주특별자치도'
  ];

  return (
    <div className="app-container">
      {/* 1. 메인 네비게이션 헤더 */}
      <header className="main-header">
        <div className="header-inner">
          {/* 브랜드 워드마크 */}
          <div className="brand-group" onClick={() => setActiveTab('dashboard')}>
            <span className="brand-wordmark">
              <span className="logo-dark">SAIP</span>
              <span className="logo-accent">LAB.</span>
            </span>
            <div className="brand-separator"></div>
            <div className="brand-title-wrap">
              <span className="brand-subtitle">AI POLICY INTELLIGENCE</span>
              <span className="brand-title">전국 지자체 AI 행정혁신 사례 연구</span>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <nav className="nav-tabs">
            {[
              { id: 'dashboard', label: '통합 대시보드', icon: BarChart3 },
              { id: 'regions', label: '17개 시도별 사례', icon: MapPin },
              { id: 'categories', label: '8대 정책분야', icon: Layers },
              { id: 'compare', label: '남양주 적합성 & 비교', icon: Scale },
              { id: 'chat', label: 'Grok RAG 챗봇', icon: Bot },
              { id: 'kanban', label: '정책 실행 과제', icon: Kanban },
              { id: 'reports', label: '시장님 보고서', icon: FileText },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon className="tab-icon" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 우측 바로가기 액션 */}
          <div>
            <button onClick={() => setActiveTab('chat')} className="btn-ai-quick">
              <Sparkles style={{ width: 14, height: 14 }} />
              <span>AI 정책 자문</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. 메인 콘텐츠 영역 */}
      <main className="main-content">
        {/* ============================================================== */}
        {/* TAB 1. 통합 대시보드 */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div>
            {/* 이솝 에디토리얼 히어로 */}
            <section className="editorial-hero">
              <div className="hero-copy">
                <h1 className="hero-title">
                  전국 지자체 AI 행정혁신 사례 모음
                </h1>
                <p className="hero-description">
                  공식 행정문서와 행정안전부 우수사례집 원문 대조를 마친 28건의 검증 표본을 바탕으로, 
                  남양주시의 복지·교통·당직·행정 효율화를 위한 최적의 실행 정책을 발굴하고 평가합니다.
                </p>
                <div className="hero-actions">
                  <button onClick={() => setActiveTab('regions')} className="btn-primary">
                    <span>17개 시도 사례 탐색</span>
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                  <button onClick={() => setActiveTab('reports')} className="btn-secondary">
                    <span>시장님 보고용 브리핑 확인</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 핵심 4대 KPI 지표 */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">수록 자료 레코드</div>
                <div className="kpi-value-row">
                  <span className="kpi-number">{stats?.total_records || 26}</span>
                  <span className="kpi-unit">건</span>
                </div>
                <div className="kpi-desc">공식 원문 대조 2차 조사 완료 자료</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">원문 시행확인 독립사업</div>
                <div className="kpi-value-row">
                  <span className="kpi-number" style={{ color: 'var(--accent-olive)' }}>
                    {stats?.verified_independent_cases || 17}
                  </span>
                  <span className="kpi-unit">건</span>
                </div>
                <div className="kpi-desc">공식 페이지에서 실제 시행 입증 완료</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-label">전국 광역 탐색 대상</div>
                <div className="kpi-value-row">
                  <span className="kpi-number" style={{ color: 'var(--text-ink)' }}>17</span>
                  <span className="kpi-unit">개 시도</span>
                </div>
                <div className="kpi-desc">11개 시도 시행확인 · 6개 시도 공백 추적</div>
              </div>

              <div className="kpi-card featured">
                <div className="kpi-label">남양주시 적용 추천 Top</div>
                <div className="kpi-value-row">
                  <span className="kpi-number">5</span>
                  <span className="kpi-unit">선</span>
                </div>
                <div className="kpi-desc">안부살핌 · 부정주차 · AI당직 등 우선순위</div>
              </div>
            </div>

            {/* 17개 시도 현황 & 분야별 통계 */}
            <div className="dashboard-columns">
              <details className="panel-card coverage-disclosure">
                <summary className="panel-header coverage-summary">
                  <div>
                    <h2 className="panel-title">전국 17개 시도 조사 현황 및 공백(Gap) 분석</h2>
                    <p className="panel-desc">
                      원문에서 시행을 확인한 사례가 없으면 '공백'으로 명시하며, 이는 사업의 부재가 아닌 추가 검증 필요성을 뜻합니다.
                    </p>
                  </div>
                  <span className="coverage-summary-actions">
                    <span className="badge-tag olive">공식 자료 대조</span>
                    <span className="coverage-toggle">
                      <span className="coverage-show">펼치기</span>
                      <span className="coverage-hide">접기</span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </span>
                  </span>
                </summary>

                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>시도명</th>
                        <th style={{ textAlign: 'center' }}>자료</th>
                        <th style={{ textAlign: 'center' }}>원문시행</th>
                        <th style={{ textAlign: 'center' }}>색인서술</th>
                        <th style={{ textAlign: 'center' }}>계획목차</th>
                        <th>현황 및 공백 상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats?.region_stats || []).map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{row.region}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{row.total_records}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--accent-olive)', fontWeight: 700 }}>
                            {row.verified_ops}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--primary-amber)' }}>
                            {row.index_ops}
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {row.plan_index}
                          </td>
                          <td>
                            <span className={`badge-tag ${row.gap_status.includes('사례 있음') ? 'olive' : 'amber'}`}>
                              {row.gap_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              {/* 분야별 분포 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="panel-card">
                  <div className="panel-header">
                    <h2 className="panel-title">정책 분야별 분포</h2>
                    <span className="badge-tag outline">다중 분류</span>
                  </div>
                  <div className="category-bars">
                    {(stats?.categories || []).map((cat, idx) => (
                      <div key={idx} className="category-row">
                        <span className="category-name">{cat.category}</span>
                        <div className="category-bar-track">
                          <div
                            className="category-bar-fill"
                            style={{ width: `${(cat.count / 26) * 100}%` }}
                          ></div>
                        </div>
                        <span className="category-count">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* 추천 사례 카드 쇼케이스 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-line)', paddingBottom: 12, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
                    남양주시 우선 도입 검토 추천 사례
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    7대 기준 평가에서 80점 이상을 획득한 고효율 벤치마킹 사례
                  </p>
                </div>
                <button onClick={() => setActiveTab('regions')} style={{ fontSize: 13, color: 'var(--primary-amber)', fontWeight: 600 }}>
                  전체 {cases.length}건 보기 →
                </button>
              </div>

              <div className="cards-grid">
                {cases.slice(0, 3).map(item => (
                  <div key={item.id} className="case-card" onClick={() => setSelectedCase(item)}>
                    <div>
                      <div className="case-header-meta">
                        <span className="case-id-region">{item.id} · {item.region} {item.city}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          style={{ color: favorites.includes(item.id) ? 'var(--primary-amber)' : 'var(--text-muted)' }}
                        >
                          <Bookmark style={{ width: 16, height: 16, fill: favorites.includes(item.id) ? 'currentColor' : 'none' }} />
                        </button>
                      </div>
                      <h3 className="case-title">{item.title}</h3>
                      <p className="case-summary">{item.summary}</p>
                    </div>

                    <div>
                      <div className="case-meta-box">
                        <div><strong>기술:</strong> {item.tech}</div>
                        <div><strong>성과:</strong> {item.performance || '미확인'}</div>
                      </div>
                      <div className="case-footer">
                        <span className="badge-tag amber">{item.category}</span>
                        <span className="link-detail">상세 분석 보기 →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2 & 3. 17개 시도별 및 8대 정책분야별 사례 연구 */}
        {/* ============================================================== */}
        {(activeTab === 'regions' || activeTab === 'categories') && (
          <div>
            <div style={{ borderBottom: '1px solid var(--border-line)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, color: 'var(--text-ink)' }}>
                  {activeTab === 'regions' ? '전국 17개 시도별 사례 연구' : '8대 정책분야별 혁신사례'}
                </h1>
              </div>

              {/* 우측 도구 모음: 2026 AI 정부 서비스 사례집 버튼 + 뷰 모드 전환 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <a
                  href="https://www.mois.go.kr/frt/bbs/type001/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000015&nttId=124688"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-sharp)',
                    boxShadow: 'var(--shadow-subtle)',
                    backgroundColor: 'var(--primary-amber)',
                    color: '#FFFFFF'
                  }}
                  title="행정안전부 공식 '2026 AI정부 서비스 사례집' 페이지 새 창 열기"
                >
                  <Download style={{ width: 14, height: 14 }} />
                  <span>2026 AI 정부 서비스 사례집</span>
                  <ExternalLink style={{ width: 12, height: 12 }} />
                </a>

                {/* 카드 / 표 뷰 전환 */}
                <div className="view-toggle-group">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                  >
                    ▦ 카드형
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  >
                    ☷ 데이터 표
                  </button>
                </div>
              </div>
            </div>

            {/* 시도 선택 칩 */}
            {activeTab === 'regions' && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.08em' }}>
                  광역시도 선택 ({REGIONS.length}개 지역)
                </div>
                <div className="chips-wrap">
                  <button
                    onClick={() => setSelectedRegion('')}
                    className={`chip-btn ${selectedRegion === '' ? 'active' : ''}`}
                  >
                    전체 시도
                  </button>
                  {REGIONS.map(reg => (
                    <button
                      key={reg}
                      onClick={() => setSelectedRegion(selectedRegion === reg ? '' : reg)}
                      className={`chip-btn ${selectedRegion === reg ? 'active' : ''}`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 정책 분야 칩 */}
            {activeTab === 'categories' && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.08em' }}>
                  8대 정책 분야 선택
                </div>
                <div className="chips-wrap">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`chip-btn ${selectedCategory === '' ? 'active' : ''}`}
                  >
                    전체 분야
                  </button>
                  {[
                    '복지·돌봄', '민원·시민서비스', '내부 행정자동화', '교통·도시',
                    '안전·재난', '재정·세무', '산업·관광', '데이터 행정'
                  ].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                      className={`chip-btn ${selectedCategory === cat ? 'active' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 툴바 */}
            <div className="toolbar-container">
              <div className="search-input-wrap">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="정책명, 지역명, AI 기술, 주요 키워드 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="select-filter"
              >
                <option value="">전체 상태</option>
                <option value="운영">운영</option>
                <option value="시범운영">시범운영</option>
                <option value="기획">기획</option>
                <option value="미확인">미확인</option>
              </select>

              {(searchQuery || selectedRegion || selectedCategory || selectedStatus) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRegion('');
                    setSelectedCategory('');
                    setSelectedStatus('');
                  }}
                  style={{ fontSize: 12, color: 'var(--primary-amber)', textDecoration: 'underline' }}
                >
                  초기화
                </button>
              )}

              <div style={{ marginLeft: 'auto', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                검색 결과: <strong>{filteredCases.length}</strong>건
              </div>
            </div>

            {/* 뷰 모드 1: 카드 그리드 */}
            {viewMode === 'card' && (
              <div className="cards-grid">
                {filteredCases.map(item => {
                  const isCasebook = 
                    item.source_title?.includes('2026 AI정부 서비스 사례집') || 
                    item.sources?.some(s => s.title.includes('2026 AI정부 서비스 사례집')) ||
                    ['C018', 'C019', 'C020', 'C027', 'C028'].includes(item.id);
                  const casebookUrl = "https://www.mois.go.kr/frt/bbs/type001/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000015&nttId=124688";

                  return (
                    <div key={item.id} className="case-card" onClick={() => setSelectedCase(item)}>
                      <div>
                        <div className="case-header-meta">
                          <span className="case-id-region">{item.id} · {item.region} {item.city}</span>
                          <span className={`badge-tag ${item.verification.includes('원문 확인') ? 'olive' : 'amber'}`}>
                            {item.verification}
                          </span>
                        </div>
                        <h3 className="case-title">{item.title}</h3>
                        <p className="case-summary">{item.summary}</p>
                      </div>

                      <div>
                        <div className="case-meta-box">
                          <div><strong>기술:</strong> {item.tech}</div>
                          <div><strong>성과:</strong> {item.performance || '미확인'}</div>
                          
                          {/* 출처 표시 영역 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--border-line)', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 11, color: 'var(--text-ink)' }}>출처:</strong>
                            {isCasebook ? (
                              <a
                                href={casebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="badge-tag amber"
                                style={{ textDecoration: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, padding: '3px 8px' }}
                                title="행정안전부 공식 '2026 AI정부 서비스 사례집' 다운로드 페이지 열기"
                              >
                                <span>📖 2026 AI정부 서비스 사례집</span>
                                <ExternalLink style={{ width: 10, height: 10 }} />
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-taupe)', fontSize: 11 }}>
                                {item.source_title || '공식 지자체 공고·보도자료'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="case-footer">
                          <span className="badge-tag outline">{item.category}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isCasebook ? (
                              <a
                                href={casebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="aesop-external-link"
                                style={{ fontSize: 11, padding: '2px 6px', backgroundColor: 'var(--bg-tint-amber)', color: 'var(--primary-amber-active)' }}
                                title="행정안전부 2026 AI정부 서비스 사례집 다운로드 바로가기"
                              >
                                <span>사례집 다운로드</span>
                                <Download style={{ width: 10, height: 10 }} />
                              </a>
                            ) : item.source_url ? (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="aesop-external-link"
                                style={{ fontSize: 11, padding: '2px 6px', backgroundColor: 'var(--bg-subtle)' }}
                                title="공식 출처 원문 새 창으로 열기"
                              >
                                <span>원문</span>
                                <ExternalLink style={{ width: 10, height: 10 }} />
                              </a>
                            ) : null}
                            <span className={`badge-tag ${item.status === '운영' ? 'olive' : 'amber'}`}>
                              {item.status}
                            </span>
                            <span className="link-detail">상세 →</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 뷰 모드 2: 데이터 표 */}
            {viewMode === 'table' && (
              <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>정책 사업명</th>
                      <th>지역</th>
                      <th>분야</th>
                      <th>적용 AI 기술</th>
                      <th>운영상태</th>
                      <th>검증구분</th>
                      <th style={{ textAlign: 'center' }}>원문</th>
                      <th style={{ textAlign: 'right' }}>상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map(item => (
                      <tr key={item.id} onClick={() => setSelectedCase(item)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-amber)' }}>{item.id}</td>
                        <td style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--text-ink)' }}>{item.title}</td>
                        <td>{item.region} {item.city}</td>
                        <td>{item.category}</td>
                        <td style={{ color: 'var(--text-muted)', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.tech}</td>
                        <td>
                          <span className={`badge-tag ${item.status === '운영' ? 'olive' : 'amber'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.verification}</td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {item.source_url ? (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="aesop-external-link"
                              style={{ fontSize: 11 }}
                              title={item.source_title?.includes('2026 AI정부 서비스 사례집') ? "행정안전부 '2026 AI정부 서비스 사례집' 다운로드 바로가기" : "공식 출처 원문 새 창으로 열기"}
                            >
                              {item.source_title?.includes('2026 AI정부 서비스 사례집') ? (
                                <Download style={{ width: 12, height: 12, color: 'var(--primary-amber)' }} />
                              ) : (
                                <ExternalLink style={{ width: 12, height: 12 }} />
                              )}
                            </a>
                          ) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-amber)' }}>열기</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4. 남양주시 적합성 7대 평가 & 다자간 비교 */}
        {/* ============================================================== */}
        {activeTab === 'compare' && (
          <div>
            <div style={{ borderBottom: '1px solid var(--border-line)', paddingBottom: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                COMPARATIVE ANALYSIS &amp; NAMYANGJU FIT
              </p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>
                남양주시 정책 적합성 7대 평가 및 우수사례 다자간 비교
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-taupe)', marginTop: 4 }}>
                타 지자체의 성과를 맹목적으로 복제하지 않고, 7대 가중 지표(시민편익, 업무절감, 남양주적합성 등)로 엄정하게 분석합니다.
              </p>
            </div>

            {/* 비교 대상 선택 박스 */}
            <div className="toolbar-container" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>비교 대상 ({comparedCases.length}/5개):</span>
                {comparedCases.map(c => (
                  <span key={c.id} className="badge-tag amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
                    <span>{c.region} - {c.title}</span>
                    <X
                      style={{ width: 12, height: 12, cursor: 'pointer' }}
                      onClick={() => setCompareIds(compareIds.filter(id => id !== c.id))}
                    />
                  </span>
                ))}
              </div>

              <select
                onChange={(e) => {
                  if (e.target.value && !compareIds.includes(e.target.value)) {
                    if (compareIds.length >= 5) {
                      alert('최대 5개까지 비교 가능합니다.');
                      return;
                    }
                    setCompareIds([...compareIds, e.target.value]);
                  }
                }}
                className="select-filter"
                value=""
              >
                <option value="">+ 비교 사례 추가</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id} disabled={compareIds.includes(c.id)}>
                    [{c.id}] {c.region} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 비교표 */}
            <div className="panel-card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{ width: 180, fontWeight: 700 }}>비교 항목</th>
                    {comparedCases.map(c => (
                      <th key={c.id} style={{ borderLeft: '1px solid var(--border-line)', fontWeight: 700 }}>
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{c.id} · {c.region} {c.city}</div>
                        <div style={{ fontSize: 15, color: 'var(--text-ink)', marginTop: 2 }}>{c.title}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, backgroundColor: 'var(--bg-subtle)' }}>남양주 적합성 총점</td>
                    {comparedCases.map(c => (
                      <td key={c.id} style={{ borderLeft: '1px solid var(--border-line)' }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--primary-amber)' }}>
                          {c.assessment?.total_score || 85}점
                        </div>
                        <span className="badge-tag olive" style={{ marginTop: 4 }}>
                          {c.assessment?.grade || '최우선 검토'}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, backgroundColor: 'var(--bg-subtle)' }}>정책 분야</td>
                    {comparedCases.map(c => (
                      <td key={c.id} style={{ borderLeft: '1px solid var(--border-line)' }}>
                        <span className="badge-tag outline">{c.category}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, backgroundColor: 'var(--bg-subtle)' }}>적용 AI 기술</td>
                    {comparedCases.map(c => (
                      <td key={c.id} style={{ borderLeft: '1px solid var(--border-line)', fontFamily: 'monospace', fontSize: 12 }}>
                        {c.tech}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, backgroundColor: 'var(--bg-subtle)' }}>사업 개요</td>
                    {comparedCases.map(c => (
                      <td key={c.id} style={{ borderLeft: '1px solid var(--border-line)', fontSize: 13, lineHeight: 1.7 }}>
                        {c.summary}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, backgroundColor: 'var(--bg-subtle)' }}>공식 확인 성과</td>
                    {comparedCases.map(c => (
                      <td key={c.id} style={{ borderLeft: '1px solid var(--border-line)', fontWeight: 600, color: 'var(--accent-olive)' }}>
                        {c.performance || '미확인'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, backgroundColor: 'var(--bg-subtle)' }}>행정적 한계 및 유의</td>
                    {comparedCases.map(c => (
                      <td key={c.id} style={{ borderLeft: '1px solid var(--border-line)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.limitations || '특이사항 없음'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, backgroundColor: 'var(--bg-subtle)' }}>남양주시 도입 제언</td>
                    {comparedCases.map(c => (
                      <td key={c.id} style={{ borderLeft: '1px solid var(--border-line)', backgroundColor: 'var(--bg-tint-amber)', fontSize: 12, lineHeight: 1.7, color: 'var(--primary-amber-active)' }}>
                        {c.assessment?.analysis_reason || '남양주시 특성에 맞춘 시범 도입 타당성 충분'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, backgroundColor: 'var(--bg-subtle)' }}>공식 출처 원문</td>
                    {comparedCases.map(c => (
                      <td key={c.id} style={{ borderLeft: '1px solid var(--border-line)' }}>
                        <a
                          href={c.source_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--primary-amber)', textDecoration: 'underline', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <span>{c.source_title || '공식 페이지'}</span>
                          <ExternalLink style={{ width: 12, height: 12 }} />
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5. RAG AI 정책 챗봇 */}
        {/* ============================================================== */}
        {activeTab === 'chat' && (
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <div style={{ borderBottom: '1px solid var(--border-line)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  OFFICIAL EVIDENCE-BASED RAG ENGINE
                </p>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>
                  AI 행정혁신 정책자문 대화 인터페이스
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-taupe)', marginTop: 4 }}>
                  전국 17개 시도 공식 문서와 인용 증거에 근거하여 사실에 입각한 정책 분석을 제공합니다.
                </p>
              </div>

              {/* 대화내용 HWPX / DOCX 저장 및 서식 복사 툴바 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownloadHwpx}
                  className="btn-secondary"
                  style={{ padding: '7px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: 'var(--bg-surface)' }}
                  title="대화 내용을 한글 표준 문서(.hwpx) 파일로 다운로드합니다 (한글 2014~2024 호환)"
                >
                  <Download style={{ width: 13, height: 13, color: '#3182CE' }} />
                  <span>{chatExported ? '저장 중...' : '한글 (.hwpx) 저장'}</span>
                </button>
                <button
                  onClick={handleDownloadDocx}
                  className="btn-secondary"
                  style={{ padding: '7px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: 'var(--bg-surface)' }}
                  title="대화 내용을 Microsoft Word 및 한글 호환(.docx) 파일로 다운로드합니다"
                >
                  <FileText style={{ width: 13, height: 13, color: 'var(--primary-amber)' }} />
                  <span>{chatExported ? '저장 중...' : '워드 (.docx) 저장'}</span>
                </button>
                <button
                  onClick={handleCopyFormattedChat}
                  className="btn-secondary"
                  style={{ padding: '7px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: 'var(--bg-surface)' }}
                  title="한글(HWP)이나 Word에 붙여넣을 때 표와 스타일이 유지되는 서식으로 복사합니다"
                >
                  {chatCopied ? (
                    <>
                      <Check style={{ width: 13, height: 13, color: 'var(--accent-olive)' }} />
                      <span>서식 복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Copy style={{ width: 13, height: 13 }} />
                      <span>한글/워드 서식 복사</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleResetChat}
                  className="btn-secondary"
                  style={{ padding: '7px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#A94442', borderColor: '#E8C5C5' }}
                  title="대화 내용을 비우고 첫 상태로 초기화합니다"
                >
                  <RotateCcw style={{ width: 13, height: 13 }} />
                  <span>초기화</span>
                </button>
              </div>
            </div>

            {/* 빠른 추천 질의 칩 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {[
                '공무원 반복업무 줄인 검증된 사례 알려줘',
                '남양주시에 적합한 고독사 AI 안부살핌 정책은?',
                '불법 부정주차 단속에 활용된 AI 사례 비교해줘',
                '야간 민원응대 AI당직원 도입 효과와 한계는?'
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(q)}
                  className="chip-btn"
                  style={{ textAlign: 'left' }}
                >
                  💬 {q}
                </button>
              ))}
            </div>

            {/* 대화 히스토리 창 */}
            <div className="chat-window">
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    {msg.role === 'user' ? '연구위원 질의' : '정책 자문 AI'}
                  </div>
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.text} />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    )}

                    {/* 출처 인용구 */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-amber-active)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck style={{ width: 14, height: 14 }} />
                          공식 검증 출처 및 근거 원문 바로가기
                        </div>
                        {msg.citations.map((c, cIdx) => (
                          <div key={cIdx} style={{ backgroundColor: '#FFFFFF', padding: 12, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', fontSize: 11 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>[{c.case_id}] {c.title} ({c.region})</span>
                              <span className="badge-tag amber" style={{ fontSize: 10 }}>검증 근거</span>
                            </div>
                            {c.quote && (
                              <div style={{ color: 'var(--text-taupe)', fontStyle: 'italic', margin: '6px 0', borderLeft: '2px solid var(--primary-amber)', paddingLeft: 6 }}>
                                "{c.quote}"
                              </div>
                            )}
                            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--border-line)' }}>
                              <a
                                href={c.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aesop-external-link"
                                style={{ fontSize: 11 }}
                                title={`${c.source_title} 공식 원문 새 창으로 열기`}
                              >
                                <span>공식 원문 바로가기: {c.source_title}</span>
                                <ExternalLink style={{ width: 11, height: 11 }} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
                  <RefreshCw style={{ width: 16, height: 16 }} className="spin-animate" />
                  <span>공식 자료 및 검증 데이터베이스 검색 중...</span>
                </div>
              )}
            </div>

            {/* 입력 폼 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="지자체 AI 행정혁신 정책에 대해 질문하세요..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                style={{ flex: 1, padding: '12px 16px', fontSize: 14 }}
              />
              <button
                onClick={() => handleSendChat()}
                disabled={chatLoading}
                className="btn-primary"
                style={{ padding: '12px 24px' }}
              >
                <Send style={{ width: 16, height: 16 }} />
                <span>질의</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6. 정책 실행 과제 칸반 보드 */}
        {/* ============================================================== */}
        {activeTab === 'kanban' && (
          <div>
            <div style={{ borderBottom: '1px solid var(--border-line)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  POLICY IMPLEMENTATION ROADMAP
                </p>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>
                  남양주시 AI 정책 실행 과제 칸반 보드
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-taupe)', marginTop: 4 }}>
                  발굴된 후보 정책을 실제 추진 단계(검토, 실증, 시범운영, 정식도입)로 체계화하여 관리합니다.
                </p>
              </div>

              {/* 신규 과제 등록 버튼 (멀티모달 오픈) */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(true)}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', fontSize: 13, fontWeight: 700, boxShadow: 'var(--shadow-subtle)' }}
                >
                  <Plus style={{ width: 16, height: 16 }} />
                  <span>+ 신규 정책과제 등록</span>
                </button>
              </div>
            </div>

            {/* 5개 칸반 컬럼 */}
            <div className="kanban-grid">
              {[
                { status: '발굴', label: '1. 발굴 (Explore)' },
                { status: '검토', label: '2. 정책 검토 (Review)' },
                { status: '타당성조사', label: '3. 타당성 조사 (PoC)' },
                { status: '시범운영', label: '4. 시범운영 (Pilot)' },
                { status: '정식운영', label: '5. 정식도입 (Operation)' }
              ].map(col => {
                const colTasks = tasks.filter(t => t.status === col.status);
                return (
                  <div key={col.status} className="kanban-column">
                    <div className="kanban-column-header">
                      <span className="kanban-column-title">{col.label}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{colTasks.length}</span>
                    </div>

                    <div className="kanban-items-list">
                      {colTasks.map(task => (
                        <div key={task.id} className="kanban-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                            <span style={{ fontFamily: 'monospace' }}>{task.id}</span>
                            <span className="badge-tag amber">{task.priority}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                            {task.task_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-taupe)', marginBottom: 8 }}>
                            🏢 {task.target_dept} · {task.manager || '담당자 미정'}
                          </div>

                          {/* 진행률 바 */}
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 2 }}>
                              <span>진행률</span>
                              <span>{task.progress}%</span>
                            </div>
                            <div style={{ height: 4, backgroundColor: 'var(--bg-subtle)', borderRadius: 1, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${task.progress}%`, backgroundColor: 'var(--primary-amber)' }}></div>
                            </div>
                          </div>

                          {/* 상태 변경 */}
                          <div style={{ textAlign: 'right', borderTop: '1px solid var(--border-line)', paddingTop: 6 }}>
                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                              style={{ fontSize: 10, padding: '2px 4px', border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
                            >
                              <option value="발굴">→ 발굴</option>
                              <option value="검토">→ 검토</option>
                              <option value="타당성조사">→ 타당성조사</option>
                              <option value="시범운영">→ 시범운영</option>
                              <option value="정식운영">→ 정식운영</option>
                            </select>
                          </div>
                        </div>
                      ))}

                      {colTasks.length === 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '32px 0' }}>
                          과제 없음
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7. 시장님 보고서 자동 생성 스튜디오 */}
        {/* ============================================================== */}
        {activeTab === 'reports' && (
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <div style={{ borderBottom: '1px solid var(--border-line)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  MAYORAL POLICY BRIEFING STUDIO
                </p>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>
                  정책 브리핑 1페이지 자동 생성
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-taupe)', marginTop: 4 }}>
                  검증된 타 지자체 성과와 남양주 행정수요 적합성을 기반으로 시장님 보고용 공문서를 즉시 생성합니다.
                </p>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className="btn-primary"
              >
                <FileText style={{ width: 16, height: 16 }} />
                <span>{reportLoading ? '보고서 작성 중...' : '보고서 자동 생성'}</span>
              </button>
            </div>

            {/* 생성된 브리핑 미리보기 */}
            {generatedReport ? (
              <div className="panel-card" style={{ padding: 48, backgroundColor: '#FFFFFF', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ borderBottom: '2px solid var(--text-ink)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text-ink)', marginTop: 4 }}>
                      {generatedReport.title.replace(/^\[시장(?:님)? 보고\]\s*/, '')}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    보고일자: {generatedReport.date}<br />
                    작성: {generatedReport.author}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {generatedReport.sections.map((sec: any, idx: number) => (
                    <div key={idx}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 700, color: 'var(--primary-amber-active)', marginBottom: 8 }}>
                        {sec.heading}
                      </h3>
                      <div style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-line)', padding: 20, borderRadius: 'var(--radius-sharp)', fontSize: 13, lineHeight: 1.8 }}>
                        <MarkdownRenderer content={sec.content} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>남양주시 스마트 행정혁신 연구동아리 공식 브리핑 제호</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => window.print()} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }}>
                      <Printer style={{ width: 14, height: 14 }} />
                      <span>인쇄 / PDF 출력</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(generatedReport, null, 2));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: 12 }}
                    >
                      {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                      <span>{copied ? '복사 완료' : '내용 복사'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel-card" style={{ textAlign: 'center', padding: '64px 20px', borderStyle: 'dashed' }}>
                <FileText style={{ width: 44, height: 44, color: 'var(--border-strong)', margin: '0 auto 12px' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                  생성된 보고서가 없습니다
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  상단의 '보고서 자동 생성' 버튼을 클릭하면 1페이지 시장님 브리핑 문서가 완성됩니다.
                </p>
                <button onClick={handleGenerateReport} className="btn-primary">
                  1페이지 브리핑 생성 시작
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. 사례 상세 분석 모달 (팝업) */}
      {selectedCase && (
        <div className="modal-overlay" onClick={() => setSelectedCase(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-amber)' }}>
                  {selectedCase.id} · {selectedCase.region} {selectedCase.city} · {selectedCase.category}
                </div>
                <h2 className="modal-title">{selectedCase.title}</h2>
              </div>
              <button onClick={() => setSelectedCase(null)} style={{ padding: 4, color: 'var(--text-muted)' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* 핵심 정보 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, backgroundColor: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sharp)', fontSize: 12, marginBottom: 20 }}>
              <div><strong>운영 상태:</strong> {selectedCase.status}</div>
              <div><strong>검증 등급:</strong> {selectedCase.verification}</div>
              <div><strong>조사 확인일:</strong> {selectedCase.checked_at}</div>
              <div><strong>적합성 점수:</strong> {selectedCase.assessment?.total_score || 85}점</div>
            </div>

            <div className="modal-body">
              <div>
                <div className="section-label">1. 사업 개요 및 해결하려는 행정문제</div>
                <div className="section-box">{selectedCase.summary}</div>
              </div>

              <div>
                <div className="section-label">2. 활용된 AI 기술 및 시스템 구성</div>
                <div className="section-box" style={{ fontFamily: 'monospace', fontSize: 13 }}>{selectedCase.tech}</div>
              </div>

              <div>
                <div className="section-label">3. 공식 확인 성과 (정량/정성)</div>
                <div className="section-box" style={{ backgroundColor: 'var(--accent-olive-bg)', color: 'var(--accent-olive-dark)', fontWeight: 600 }}>
                  {selectedCase.performance || '공식자료에서 별도 성과 수치 확인되지 않음 (미확인 원칙)'}
                </div>
              </div>

              {selectedCase.limitations && (
                <div>
                  <div className="section-label">4. 행정적 한계 및 보수적 검토 사항</div>
                  <div className="section-box" style={{ backgroundColor: 'var(--bg-tint-amber)', color: 'var(--primary-amber-active)' }}>
                    {selectedCase.limitations}
                  </div>
                </div>
              )}

              <div>
                <div className="section-label">5. 공식 출처 및 검증 근거 원문 (클릭 시 새 탭 이동 / 복사 가능)</div>
                <div className="source-cards-list">
                  {selectedCase.sources && selectedCase.sources.length > 0 ? (
                    selectedCase.sources.map((src, sIdx) => {
                      const copyId = src.id || `src-${sIdx}`;
                      const isCopied = copiedUrlId === copyId;
                      return (
                        <div
                          key={copyId}
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-line)',
                            borderRadius: 'var(--radius-sharp)',
                            padding: '12px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            boxShadow: 'var(--shadow-subtle)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, color: 'var(--text-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{src.title}</span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-taupe)', marginTop: 2 }}>
                                🏢 {src.publisher || '공공기관'} · {src.access_status || src.accessStatus || '원문 확인'}
                                {(src.published_at || src.publishedAt) && ` · 발행: ${src.published_at || src.publishedAt}`}
                                {src.locator && ` · 위치: ${src.locator}`}
                              </div>
                            </div>
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: 11, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                              title="공식 원문 새 창으로 열기"
                            >
                              <span>원문 열기</span>
                              <ExternalLink style={{ width: 11, height: 11 }} />
                            </a>
                          </div>

                          {/* 축소된 URL 표시창 + 복사 버튼 (박스를 절대 벗어나지 않음) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-line)', minWidth: 0 }}>
                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                                fontFamily: 'monospace',
                                fontSize: 11,
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={src.url}
                            >
                              {src.url}
                            </div>
                            <button
                              onClick={() => handleCopyUrl(src.url, copyId)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: isCopied ? 'var(--primary-amber)' : '#FFFFFF',
                                color: isCopied ? '#FFFFFF' : 'var(--text-ink)',
                                border: '1px solid var(--border-line)',
                                borderRadius: 3,
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 150ms ease'
                              }}
                              title="URL 클립보드 복사"
                            >
                              {isCopied ? (
                                <>
                                  <Check style={{ width: 12, height: 12 }} />
                                  <span>복사됨!</span>
                                </>
                              ) : (
                                <>
                                  <Copy style={{ width: 12, height: 12 }} />
                                  <span>URL 복사</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-line)',
                        borderRadius: 'var(--radius-sharp)',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        boxShadow: 'var(--shadow-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, color: 'var(--text-ink)' }}>
                            {selectedCase.source_title || '공식 원문 페이지'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-taupe)', marginTop: 2 }}>
                            공식 검증 출처 링크
                          </div>
                        </div>
                        <a
                          href={selectedCase.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: 11, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                          title="공식 원문 새 창으로 열기"
                        >
                          <span>원문 열기</span>
                          <ExternalLink style={{ width: 11, height: 11 }} />
                        </a>
                      </div>

                      {/* 축소된 URL 표시창 + 복사 버튼 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border-line)', minWidth: 0 }}>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={selectedCase.source_url}
                        >
                          {selectedCase.source_url}
                        </div>
                        <button
                          onClick={() => handleCopyUrl(selectedCase.source_url, 'single-source')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: copiedUrlId === 'single-source' ? 'var(--primary-amber)' : '#FFFFFF',
                            color: copiedUrlId === 'single-source' ? '#FFFFFF' : 'var(--text-ink)',
                            border: '1px solid var(--border-line)',
                            borderRadius: 3,
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 150ms ease'
                          }}
                          title="URL 클립보드 복사"
                        >
                          {copiedUrlId === 'single-source' ? (
                            <>
                              <Check style={{ width: 12, height: 12 }} />
                              <span>복사됨!</span>
                            </>
                          ) : (
                            <>
                              <Copy style={{ width: 12, height: 12 }} />
                              <span>URL 복사</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--border-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => {
                  if (!compareIds.includes(selectedCase.id)) {
                    setCompareIds([...compareIds.slice(0, 4), selectedCase.id]);
                  }
                  setSelectedCase(null);
                  setActiveTab('compare');
                }}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: 12 }}
              >
                비교 분석함에 추가
              </button>
              <button
                onClick={() => setSelectedCase(null)}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: 12 }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          신규 정책 실행 과제 등록 멀티모달 창
          ============================================================================== */}
      {isTaskModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTaskModalOpen(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 740, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-amber)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>NAMYANGJU CITY AI ROADMAP</span>
                  <span className="badge-tag amber" style={{ fontSize: 10 }}>실행 과제 등록 폼</span>
                </div>
                <h2 className="modal-title" style={{ marginTop: 4 }}>남양주시 AI 정책 실행 과제 정밀 등록</h2>
                <p style={{ fontSize: 12, color: 'var(--text-taupe)', marginTop: 2 }}>
                  발굴된 전국 지자체 우수사례를 바탕으로 남양주시 행정에 도입할 실행 과제를 정해진 표준 서식에 맞춰 등록합니다.
                </p>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                style={{ padding: 6, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X style={{ width: 22, height: 22 }} />
              </button>
            </div>

            <form onSubmit={handleCreateTaskFromModal} style={{ padding: '20px 0 0 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px', marginBottom: 20 }}>
                
                {/* 1. 추진 과제명 (전체 너비) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    과제명 (Task Name) <span style={{ color: '#E05638' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 다산·별내지구 AI 현장 계도형 부정주차 단속 시스템 시범도입"
                    value={taskForm.task_name}
                    onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  />
                </div>

                {/* 2. 연계 벤치마킹 우수사례 (전체 너비) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    연계 벤치마킹 우수사례 (Benchmark Reference Case)
                  </label>
                  <select
                    value={taskForm.case_id}
                    onChange={(e) => {
                      const selCaseId = e.target.value;
                      const matchedCase = cases.find(c => c.id === selCaseId);
                      setTaskForm({
                        ...taskForm,
                        case_id: selCaseId,
                        target_dept: matchedCase ? (
                          matchedCase.category.includes('교통') ? '첨단교통과' :
                          matchedCase.category.includes('복지') ? '복지기획과' :
                          matchedCase.category.includes('민원') ? '종합민원원' :
                          matchedCase.category.includes('자동화') ? '총무과' :
                          matchedCase.category.includes('안전') ? '안전기획과' : '스마트도시과'
                        ) : taskForm.target_dept,
                        key_kpi: matchedCase?.performance && matchedCase.performance !== '미확인' ? matchedCase.performance : taskForm.key_kpi
                      });
                    }}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  >
                    <option value="">-- 직접 기획 (연계 사례 없음) --</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        [{c.id}] {c.region} {c.city} - {c.title} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. 소관 부서 */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    소관 부서 (Target Department) <span style={{ color: '#E05638' }}>*</span>
                  </label>
                  <select
                    value={taskForm.target_dept}
                    onChange={(e) => setTaskForm({ ...taskForm, target_dept: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  >
                    <option value="스마트도시과">스마트도시과</option>
                    <option value="첨단교통과">첨단교통과</option>
                    <option value="주차관리과">주차관리과</option>
                    <option value="복지기획과">복지기획과</option>
                    <option value="종합민원원">종합민원원</option>
                    <option value="총무과">총무과</option>
                    <option value="정보통신과">정보통신과</option>
                    <option value="기획예산과">기획예산과</option>
                    <option value="안전기획과">안전기획과</option>
                    <option value="환경정책과">환경정책과</option>
                    <option value="기타 직속기관">기타 부서/직속기관</option>
                  </select>
                </div>

                {/* 4. 담당자 / 직급 */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    담당자 및 직급 (Manager / Officer)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 김혁신 팀장 / 박스마트 주무관"
                    value={taskForm.manager}
                    onChange={(e) => setTaskForm({ ...taskForm, manager: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  />
                </div>

                {/* 5. 추진 단계 */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    초기 추진 단계 (Status) <span style={{ color: '#E05638' }}>*</span>
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  >
                    <option value="발굴">1. 발굴 (Explore)</option>
                    <option value="검토">2. 정책 검토 (Review)</option>
                    <option value="타당성조사">3. 타당성 조사 (PoC)</option>
                    <option value="시범운영">4. 시범운영 (Pilot)</option>
                    <option value="정식운영">5. 정식도입 (Operation)</option>
                  </select>
                </div>

                {/* 6. 우선순위 */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    우선순위 (Priority) <span style={{ color: '#E05638' }}>*</span>
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  >
                    <option value="최우선">최우선 (Immediate Priority)</option>
                    <option value="높음">높음 (High)</option>
                    <option value="보통">보통 (Medium)</option>
                    <option value="낮음">낮음 (Low)</option>
                  </select>
                </div>

                {/* 7. 진행률 슬라이더 */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    <span>초기 진행률</span>
                    <span style={{ color: 'var(--primary-amber)', fontFamily: 'monospace' }}>{taskForm.progress}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={taskForm.progress}
                    onChange={(e) => setTaskForm({ ...taskForm, progress: Number(e.target.value) })}
                    style={{ width: '100%', marginTop: 8, accentColor: 'var(--primary-amber)' }}
                  />
                </div>

                {/* 8. 배정 예산 */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    배정 예산 (Budget, 단위: 만원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="예: 5000 (5,000만원)"
                    value={taskForm.budget_allocated || ''}
                    onChange={(e) => setTaskForm({ ...taskForm, budget_allocated: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  />
                </div>

                {/* 9. 목표 성과지표 (KPI) (전체 너비) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    핵심 목표 성과지표 (Key KPI / Target Output)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 거주자 우선주차 부정주차 민원 70% 사전 예방 및 주차면 회전율 극대화"
                    value={taskForm.key_kpi}
                    onChange={(e) => setTaskForm({ ...taskForm, key_kpi: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  />
                </div>

                {/* 10. 목표 완료 시점 (전체 너비) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    추진 목표 일정 (Target Schedule)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 2026년 하반기 시범운영 착수 (2026.10 ~ 2026.12)"
                    value={taskForm.target_date}
                    onChange={(e) => setTaskForm({ ...taskForm, target_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF' }}
                  />
                </div>

                {/* 11. 세부 실행 계획 및 비고 (전체 너비) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-ink)', marginBottom: 6 }}>
                    추진 배경 및 세부 계획 (Notes / Plan Details)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="행정적 기대효과, 부서 간 협업 사항, 예상되는 제약요건 등을 상세히 기술하세요..."
                    value={taskForm.notes}
                    onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '1px solid var(--border-line)', borderRadius: 'var(--radius-sharp)', backgroundColor: '#FFF', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* 모달 하단 등록/취소 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-line)', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 20px', fontSize: 13 }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '10px 24px', fontSize: 13, fontWeight: 700 }}
                >
                  + 과제 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. 이솝 스타일 정갈한 푸터 */}
      <footer className="main-footer">
        <div className="footer-inner">
          <div>
            <span className="brand-wordmark" style={{ fontSize: 16, marginRight: 8 }}>
              <span className="logo-dark">SAIP</span><span className="logo-accent">LAB.</span>
            </span>
            <span>전국 지방자치단체 AI 행정혁신 정책연구 플랫폼</span>
            <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>
              운영 주체: 남양주시 스마트 행정혁신 연구동아리 · 데이터 검증 기준일: 2026-10-17 2차 조사본
            </div>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>
            CONFIDENTIAL FOR NAMYANGJU POLICY RESEARCH<br />
            VERSION 2.0.0 (AESOP EDITORIAL EDITION)
          </div>
        </div>
      </footer>
    </div>
  );
}
