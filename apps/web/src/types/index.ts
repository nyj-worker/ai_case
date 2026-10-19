/**
 * 프론트엔드 전역 타입 정의 (types/index.ts)
 */

export interface Source {
  id: string;
  title: string;
  publisher: string;
  publishedAt?: string;
  published_at?: string;
  url: string;
  checkedAt?: string;
  checked_at?: string;
  accessStatus?: string;
  access_status?: string;
  role?: string;
  locator?: string;
}

export interface Evidence {
  id?: string;
  sourceId?: string;
  claim: string;
  quote: string;
  locator?: string;
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
  analysis_reason?: string;
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
  benefit?: string;
  performance?: string;
  performance_verification?: string;
  source_url: string;
  source_title?: string;
  published_at?: string;
  checked_at: string;
  status_as_of?: string;
  current_status?: string;
  verification: string;
  implementation_evidence: boolean;
  budget?: string;
  limitations?: string;
  parent_case_id?: string;
  record_type?: string;
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
  case_id?: string;
  task_name: string;
  target_dept: string;
  manager?: string;
  status: string;
  priority: string;
  start_date?: string;
  target_date?: string;
  progress: number;
  budget_allocated: number;
  key_kpi?: string;
  notes?: string;
  created_at: string;
}

export interface ChatCitation {
  case_id: string;
  title: string;
  region: string;
  source_title?: string;
  source_url: string;
  quote?: string;
}

export interface ChatResponse {
  answer: string;
  citations: ChatCitation[];
  model: string;
  confidence: string;
}
