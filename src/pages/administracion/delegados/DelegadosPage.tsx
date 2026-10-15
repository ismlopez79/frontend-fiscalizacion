import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Collapse, IconButton, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOnOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOffOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import { catalogApi } from "@/api/catalogApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { FloatingToolbar, toolbarFieldSx } from "@/components/ui/FloatingToolbar";
import { getApiErrorMessage } from "@/utils/apiError";
import { DELEGATE_TYPES, DELEGATE_TYPE_LABELS } from "@/types/catalog";
import type { DelegateDto, DelegateType } from "@/types/catalog";
import { DelegadoFormDialog } from "./DelegadoFormDialog";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

type DialogState = { type: "closed" } | { type: "create" } | { type: "edit"; item: DelegateDto };

export function DelegadosPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [typeFilter, setTypeFilter] = useState<DelegateType | "">("");
  const { toast, showToast, closeToast } = useToast();

  const delegadosQuery = useQuery({
    queryKey: ["delegados", typeFilter || null],
    queryFn: () => catalogApi.getDelegados(typeFilter || undefined),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (target: DelegateDto) =>
      catalogApi.updateDelegado(target.id, {
        firstName: target.firstName,
        lastName: target.lastName,
        internalCode: target.internalCode ?? undefined,
        // dui es requerido desde la migracion V15. El toggle solo se
        // habilita en la UI cuando target.dui ya existe (ver columna
        // "actions"): si es un registro legado sin DUI, hay que editarlo
        // completo primero para capturarlo.
        dui: target.dui ?? "",
        type: target.type,
        active: !target.active,
        politicalPartyId: target.politicalPartyId ?? undefined,
      }),
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: ["delegados"] });
      showToast(
        "success",
        target.active
          ? `"${target.firstName} ${target.lastName}" desactivado.`
          : `"${target.firstName} ${target.lastName}" activado.`
      );
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo cambiar el estado.")),
  });

  const columns: GridColDef<DelegateDto>[] = useMemo(
    () => [
      { field: "firstName", headerName: "Nombre", flex: 1, minWidth: 140, cellClassName: "cell-strong" },
      { field: "lastName", headerName: "Apellido", flex: 1, minWidth: 140, cellClassName: "cell-strong" },
      {
        field: "internalCode",
        headerName: "Código interno",
        width: 140,
        valueGetter: (_v, row) => row.internalCode ?? "—",
      },
      {
        field: "dui",
        headerName: "DUI",
        width: 130,
        valueGetter: (_v, row) => row.dui ?? "—",
      },
      {
        field: "type",
        headerName: "Tipo",
        width: 170,
        valueGetter: (_v, row) => DELEGATE_TYPE_LABELS[row.type] ?? row.type,
      },
      {
        field: "politicalPartyName",
        headerName: "Partido político",
        width: 200,
        sortable: false,
        renderCell: (params) => {
          if (!params.row.partyRequired) return <span>—</span>;
          if (params.row.politicalPartyId) return <span>{params.row.politicalPartyName}</span>;
          return (
            <Tooltip title="Delegado JVE sin partido político asignado. Edítalo para completarlo.">
              <Chip
                size="small"
                label="Falta partido"
                color="warning"
                variant="outlined"
                icon={<WarningAmberIcon fontSize="small" />}
              />
            </Tooltip>
          );
        },
      },
      {
        field: "linkedUsername",
        headerName: "Vínculo",
        width: 150,
        sortable: false,
        renderCell: (params) =>
          params.row.linkedUsername ? (
            <Tooltip
              title={`Vinculado al usuario "${params.row.linkedUsername}". Se sincroniza automáticamente desde Usuarios — edítalo ahí, no aquí.`}
            >
              <Chip
                size="small"
                icon={<LockOutlinedIcon fontSize="small" />}
                label={params.row.linkedUsername}
                variant="outlined"
                color="info"
              />
            </Tooltip>
          ) : (
            <span>—</span>
          ),
      },
      {
        field: "active",
        headerName: "Estado",
        width: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.active ? "Activo" : "Inactivo"}
            color={params.row.active ? "success" : "default"}
            variant={params.row.active ? "filled" : "outlined"}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const isLinked = !!params.row.linkedUsername;
          const missingDui = !params.row.dui;
          const missingParty = params.row.partyRequired && !params.row.politicalPartyId;
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip
                title={
                  isLinked
                    ? "Vinculado a un usuario: edítalo desde Usuarios, no aquí."
                    : "Editar"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={isLinked}
                    onClick={() => setDialog({ type: "edit", item: params.row })}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip
                title={
                  isLinked
                    ? "Vinculado a un usuario: su estado se sincroniza desde Usuarios."
                    : missingDui
                      ? "Este delegado no tiene DUI capturado. Edítalo primero para poder cambiar su estado."
                      : missingParty
                        ? "Este delegado no tiene partido político asignado. Edítalo primero para poder cambiar su estado."
                        : params.row.active
                          ? "Desactivar"
                          : "Activar"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={isLinked || missingDui || missingParty || toggleActiveMutation.isPending}
                    onClick={() => toggleActiveMutation.mutate(params.row)}
                  >
                    {params.row.active ? (
                      <ToggleOnIcon fontSize="small" color="success" />
                    ) : (
                      <ToggleOffIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [toggleActiveMutation]
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2 }}>
      <PageHeader
        title="Delegados"
        subtitle="Personas que firman el acta: delegado JVE, delegado RNPN o jefe de duicentro."
        actions={
          <>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ type: "create" })}>
              Nuevo delegado
            </Button>
          </>
        }
      />

      <FloatingToolbar>
        <TextField
          select
          size="small"
          aria-label="Filtrar por tipo"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as DelegateType | "")}
          SelectProps={{ displayEmpty: true }}
          sx={{ minWidth: 220, ...toolbarFieldSx }}
        >
          <MenuItem value="">Todos los tipos</MenuItem>
          {DELEGATE_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {DELEGATE_TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </TextField>
      </FloatingToolbar>

      <Collapse in={delegadosQuery.isError}>
        <Callout tone="error" title="No se pudo cargar el catálogo">
          {getApiErrorMessage(delegadosQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      </Collapse>

      <DataTable
          rows={delegadosQuery.data ?? []}
          columns={columns}
          loading={delegadosQuery.isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: "lastName", sort: "asc" }] },
          }}
          pageSizeOptions={[10, 25, 50]}
          empty={{ title: "Ningún delegado", hint: "Usa el botón de arriba para agregar el primero." }}
        />

      <DelegadoFormDialog
        open={dialog.type === "create" || dialog.type === "edit"}
        delegado={dialog.type === "edit" ? dialog.item : null}
        onClose={() => setDialog({ type: "closed" })}
      />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
