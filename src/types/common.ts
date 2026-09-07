export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // pagina actual (0-based, igual que Spring Data)
  size: number;
  first?: boolean;
  last?: boolean;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details: string[];
}
