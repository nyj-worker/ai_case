/**
 * 프론트엔드 전역 타입 정의 (types/index.ts)
 */

export interface Source {
  id: string;
  title: string;
  publisher: string;
  publishedAt?: string | null;
  published_at?: string | null;
  url: string;
  checkedAt?: string | null;
  checked_at?: string | null;
  accessStatus?: string | null;
  access_status?: string | null;
  role?: string | null;
  locator?: string | null;
}

export interface Evidence {
  id?: string | null;
  sourceId?: string | null;
  claim: string;
  quote: string;
  locator?: string | null;
  supportsPerformance?: boolean;
}

export interface Assessment {
  id: string;
  case_id: string;
  citizen_benefit: number;
  work_reduction: number;
  nyj_fit: number;
  cost_efficiency: number;
  tech_feasibility: number;
  legal_safety: number;
  org_acceptability: number;
  total_score: number;
  grade: string;
  analysis_reason?: string | null;
  is_approved: boolean;
  assessed_by: string;
  assessed_at: string;
}

export interface Case {
  id: string;
  title: string;
  region: string;
  city: string;
  category: string;
  status: string;
  summary: string;
  tech: string;
  benefit?: string | null;
  performance?: string | null;
  performance_verification?: string | null;
  source_url: string;
  source_title?: string | null;
  published_at?: string | null;
  checked_at: string;
  status_as_of?: string | null;
  current_status?: string | null;
  verification: string;
  implementation_evidence: boolean;
  budget?: string | null;
  limitations?: string | null;
  parent_case_id?: string | null;
  record_type?: string | null;
  is_demo: boolean;
  sources?: Source[];
  evidences?: Evidence[];
  assessment?: Assessment;
}

export interface RegionStat {
  region: string;
  total_records: number;
  verified_ops: number;
  index_ops: number;
  plan_index: number;
  gap_status: string;
}

export interface CategoryStat {
  category: string;
  count: number;
}

export interface DashboardStats {
  total_records: number;
  verified_independent_cases: number;
  operational_cases: number;
  pilot_cases: number;
  planning_cases: number;
  unconfirmed_cases: number;
  top_recommended_cases: Case[];
  categories: CategoryStat[];
  region_stats: RegionStat[];
}

export interface PolicyTask {
  id: string;
  case_id?: string | null;
  task_name: string;
  target_dept: string;
  manager?: string | null;
  status: string;
  priority: string;
  start_date?: string | null;
  target_date?: string | null;
  progress: number;
  budget_allocated: number;
  key_kpi?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ChatCitation {
  case_id?: string;
  title: string;
  region?: string;
  source_id?: string;
  publisher?: string;
  source_title?: string;
  source_url: string;
  url?: string;
  quote?: string;
}

export interface ChatResponse {
  answer: string;
  citations: ChatCitation[];
  model?: string;
  confidence?: string;
  response?: string;
  model_used?: string;
  processing_time_ms?: number;
  case_ids_referenced?: string[];
}
