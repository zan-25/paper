import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

async function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return response.json();
}

export interface AIProcessResult {
  success: boolean;
  document_id?: number;
  filename: string;
  total_extracted: number;
  auto_approved: number;
  processing_time: number;
  ai_model: string;
  ai_mode: string;
  summary: {
    by_module: Record<string, number>;
    by_rbt: Record<string, number>;
    by_co: Record<string, number>;
    by_difficulty: Record<string, number>;
  };
  error?: string;
}

export interface Question {
  id: number;
  text: string;
  marks: number;
  course_outcome: string;
  bloom_level: string;
  difficulty: string;
  module_number: number;
  question_type: string;
  is_verified: boolean;
}

export interface PaperQuestion {
  id: number;
  question_id: number;
  order_index: number;
  section_label: string;
  custom_marks: number | null;
  text: string;
  course_outcome?: string | null;
  bloom_level?: string | null;
  module_number?: number | null;
  difficulty?: string | null;
}

export interface GeneratedPaper {
  id: number;
  subject_id: number;
  subject_name?: string | null;
  subject_code?: string | null;
  department_name?: string | null;
  title: string;
  exam_type: string;
  semester: string;
  batch: string;
  max_marks: number;
  duration_minutes: number;
  exam_date?: string;
  teaching_department: string;
  status: string;
  ai_config: Record<string, any>;
  coverage_stats: Record<string, any>;
  questions: PaperQuestion[];
  download_path?: string;
}

export interface GeneratePaperParams {
  subject_id: number;
  title: string;
  exam_type: string;
  semester: string;
  batch: string;
  max_marks: number;
  duration_minutes: number;
  exam_date?: string;
  teaching_department: string;
  prompt: string;
  rbt_levels: string[];
  module_numbers: number[];
  difficulty_distribution?: Record<string, number>;
  co_targets?: Record<string, number>;
  co_descriptions?: Record<string, string>;
  difficulty?: string;
  instructions?: string;
  manual_question_ids?: number[];
}

export interface QuestionBankSummary {
  total_documents: number;
  total_questions: number;
  verified_questions: number;
  pending_questions: number;
  retrieval_ready_questions: number;
  by_module: Record<string, number>;
  by_rbt: Record<string, number>;
  by_co: Record<string, number>;
  by_difficulty: Record<string, number>;
  recent_documents: Array<{
    id: number;
    filename: string;
    upload_status: string;
    created_at: string;
    question_count: number;
  }>;
  gaps: string[];
}

export function useAIPrintQuestionBank() {
  const queryClient = useQueryClient();

  return useMutation<AIProcessResult, Error, { subject_id: number; file: File }>({
    mutationFn: async ({ subject_id, file }) => {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/ai/process-question-bank?subject_id=${subject_id}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Processing failed" }));
        throw new Error(error.detail || "Processing failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });
}

export function useAIGeneratePaper() {
  const queryClient = useQueryClient();

  return useMutation<GeneratedPaper, Error, GeneratePaperParams>({
    mutationFn: async (params) => {
      return fetchWithAuth<GeneratedPaper>("/ai/generate-paper", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["papers"] });
    },
  });
}

export function useQuestionBankSummary(subjectId?: number) {
  return useQuery<QuestionBankSummary>({
    queryKey: ["ai-question-bank-summary", subjectId],
    queryFn: async () => {
      const suffix = subjectId ? `?subject_id=${subjectId}` : "";
      return fetchWithAuth<QuestionBankSummary>(`/ai/question-bank-summary${suffix}`);
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useQuestions(subjectId?: number, filters?: {
  bloom_level?: string;
  difficulty?: string;
  module?: number;
}) {
  return useQuery<Question[]>({
    queryKey: ["questions", subjectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (subjectId) params.append("subject_id", subjectId.toString());
      if (filters?.bloom_level) params.append("bloom_level", filters.bloom_level);
      if (filters?.difficulty) params.append("difficulty", filters.difficulty);
      
      return fetchWithAuth<Question[]>(`/questions?${params.toString()}`);
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      return fetchWithAuth<any[]>("/subjects");
    },
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
  });
}

export function usePapers() {
  return useQuery({
    queryKey: ["papers"],
    queryFn: async () => {
      return fetchWithAuth<GeneratedPaper[]>("/papers");
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useDownloadPaper() {
  return useMutation<Blob, Error, number>({
    mutationFn: async (paperId) => {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/papers/${paperId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      return response.blob();
    },
  });
}
