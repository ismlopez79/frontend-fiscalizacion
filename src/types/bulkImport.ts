export type BulkImportRowStatus = "CREATED" | "SKIPPED" | "ERROR";

export interface BulkImportRowDetail {
  /** Numero de fila real en el Excel (incluye encabezado: la primera fila de datos es la 2). */
  row: number;
  status: BulkImportRowStatus;
  message: string;
}

export interface BulkImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  errors: number;
  details: BulkImportRowDetail[];
}
