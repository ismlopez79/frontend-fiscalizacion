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
  /**
   * El campo con el codigo corto (ACCOUNT_LOCKED, MODULE_DISABLED, ...) se
   * llama "error" en la mayoria de endpoints, pero "code" en los del modulo
   * de Elecciones (GET/PUT /modulos, MODULE_DISABLED) — ver getApiErrorCode,
   * que revisa ambos.
   */
  error?: string;
  code?: string;
  message: string;
  details: string[];
}
