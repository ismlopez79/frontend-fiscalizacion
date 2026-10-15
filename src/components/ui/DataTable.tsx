import type { ReactNode } from "react";
import { Paper } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { DataGridProps, GridValidRowModel } from "@mui/x-data-grid";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { designTokens } from "@/theme/theme";
import { EmptyState } from "./EmptyState";

const numberFormatter = new Intl.NumberFormat("es-SV");

interface DataTableProps<R extends GridValidRowModel> extends Omit<DataGridProps<R>, "slots"> {
  /** Estado vacio propio; por defecto un mensaje neutro. */
  empty?: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode };
  slots?: DataGridProps<R>["slots"];
  /** Filas clicables (cursor de mano); el comportamiento lo da onRowClick. */
  clickableRows?: boolean;
}

/**
 * Tabla estandar del sistema: DataGrid dentro de una superficie, alto segun
 * su contenido (la pagina hace el scroll, no la tabla), filas comodas para
 * el dedo, celdas centradas verticalmente, paginacion en español y un estado
 * vacio que explica que hacer. Todas las secciones usan esta en vez de
 * configurar el DataGrid a mano cada vez.
 */
export function DataTable<R extends GridValidRowModel>({
  empty,
  slots,
  clickableRows,
  sx,
  localeText,
  ...props
}: DataTableProps<R>) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <DataGrid<R>
        autoHeight
        disableRowSelectionOnClick
        disableColumnMenu
        rowHeight={56}
        columnHeaderHeight={44}
        {...props}
        localeText={{
          MuiTablePagination: {
            labelRowsPerPage: "Por página",
            labelDisplayedRows: ({ from, to, count }) =>
              `${from}–${to} de ${count === -1 ? "muchos" : numberFormatter.format(count)}`,
          },
          ...localeText,
        }}
        slots={{
          noRowsOverlay: () => (
            <EmptyState
              icon={empty?.icon ?? <InboxOutlinedIcon />}
              title={empty?.title ?? "Sin registros"}
              hint={empty?.hint}
              action={empty?.action}
            />
          ),
          ...slots,
        }}
        sx={[
          {
            "--DataGrid-overlayHeight": "280px",
            "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
            // Jerarquia por columna: el nombre manda, el codigo acompaña.
            "& .cell-strong": { fontWeight: 600, color: "text.primary" },
            "& .cell-code": { color: designTokens.textCaption, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" },
            "& .cell-num": { fontVariantNumeric: "tabular-nums" },
            ...(clickableRows ? { "& .MuiDataGrid-row": { cursor: "pointer" } } : {}),
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      />
    </Paper>
  );
}
