import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chip } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import dayjs from "dayjs";
import { temporaryDelegateApi } from "@/api/electoralApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import type { ProfileSection } from "@/components/ProfileDrawer";
import { UserAvatar } from "@/components/UserAvatar";
import type { TemporaryDelegateDto } from "@/types/electoral";

interface DelegadoTemporalPerfilDrawerProps {
  /** Fila del listado: pinta el drawer al instante mientras llega el detalle fresco por GET /delegados-temporales/{id}. */
  delegado: TemporaryDelegateDto | null;
  onClose: () => void;
  onEdit: (delegado: TemporaryDelegateDto) => void;
}

export function DelegadoTemporalPerfilDrawer({ delegado, onClose, onEdit }: DelegadoTemporalPerfilDrawerProps) {
  // Conserva el ultimo delegado abierto para que el contenido no desaparezca
  // durante la animacion de salida del drawer.
  const lastDelegado = useRef(delegado);
  if (delegado) lastDelegado.current = delegado;
  const target = delegado ?? lastDelegado.current;

  const detailQuery = useQuery({
    queryKey: ["delegados-temporales", "detalle", target?.id],
    queryFn: () => temporaryDelegateApi.getDelegadoTemporal(target!.id),
    enabled: !!delegado,
  });

  const data = detailQuery.data ?? target;

  const sections: ProfileSection[] = data
    ? [
        {
          title: "Contacto",
          fields: [
            {
              label: "Teléfono",
              value: data.phone,
              href: data.phone ? `tel:${data.phone.replace("-", "")}` : undefined,
              copyValue: data.phone,
              numeric: true,
            },
            {
              label: "Correo",
              value: data.email,
              href: data.email ? `mailto:${data.email}` : undefined,
              copyValue: data.email,
            },
          ],
        },
        {
          title: "Identificación",
          fields: [
            { label: "DUI", value: data.dui, copyValue: data.dui, numeric: true },
            { label: "Usuario", value: data.username },
          ],
        },
        {
          title: "Asignación",
          fields: [
            { label: "Período", value: data.electoralPeriodName },
            { label: "Partido político", value: data.politicalPartyName },
          ],
        },
        {
          title: "Registro",
          fields: [
            { label: "Creado", value: dayjs(data.createdAt).format("DD/MM/YYYY HH:mm"), numeric: true },
            { label: "Actualizado", value: dayjs(data.updatedAt).format("DD/MM/YYYY HH:mm"), numeric: true },
          ],
        },
      ]
    : [];

  return (
    <ProfileDrawer
      open={!!delegado}
      onClose={onClose}
      loading={!data}
      error={
        detailQuery.isError ? getApiErrorMessage(detailQuery.error, "No se pudo cargar el perfil del delegado.") : null
      }
      avatar={
        data && (
          <UserAvatar
            userId={data.id}
            hasPhoto={!!data.profilePhotoUrl}
            fallbackText={data.fullName.charAt(0).toUpperCase()}
            name={data.fullName}
            size={88}
            fetchPhoto={temporaryDelegateApi.getFotoPerfil}
            cacheNamespace="foto-perfil-delegado-temporal"
          />
        )
      }
      fullName={data?.fullName}
      username={data?.username}
      badges={
        data && (
          <>
            <Chip
              size="small"
              label={data.active ? "Activo" : "Inactivo"}
              color={data.active ? "success" : "default"}
              variant={data.active ? "filled" : "outlined"}
            />
            {data.locked && <Chip size="small" label="Bloqueada" color="error" icon={<LockOutlinedIcon />} />}
            {data.primerIngreso && (
              <Chip size="small" label="Pendiente primer ingreso" color="warning" variant="outlined" />
            )}
          </>
        )
      }
      sections={sections}
      onEdit={data ? () => onEdit(data) : undefined}
    />
  );
}
