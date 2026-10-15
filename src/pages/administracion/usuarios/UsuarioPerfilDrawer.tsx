import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chip } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import dayjs from "dayjs";
import { userApi } from "@/api/userApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import type { ProfileSection } from "@/components/ProfileDrawer";
import { UserAvatar } from "@/components/UserAvatar";
import { DIGITADOR_ROLE_NAME } from "@/types/user";
import type { UserDto } from "@/types/user";

interface UsuarioPerfilDrawerProps {
  /** Fila del listado: pinta el drawer al instante mientras llega el detalle fresco por GET /usuarios/{id}. */
  user: UserDto | null;
  onClose: () => void;
  onEdit: (user: UserDto) => void;
}

export function UsuarioPerfilDrawer({ user, onClose, onEdit }: UsuarioPerfilDrawerProps) {
  // Conserva el ultimo usuario abierto para que el contenido no desaparezca
  // durante la animacion de salida del drawer.
  const lastUser = useRef(user);
  if (user) lastUser.current = user;
  const target = user ?? lastUser.current;

  const detailQuery = useQuery({
    queryKey: ["usuarios", "detalle", target?.id],
    queryFn: () => userApi.getUsuario(target!.id),
    enabled: !!user,
  });

  // Mientras llega el detalle se usa la fila ya cargada: sin parpadeo de skeletons.
  const data = detailQuery.data ?? target;
  const isDigitador = !!data?.roles.includes(DIGITADOR_ROLE_NAME);

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
            { label: "Roles", value: data.roles.join(", ") || null },
          ],
        },
        ...(isDigitador
          ? [
              {
                title: "Delegado JVE vinculado",
                fields: [
                  { label: "Delegado", value: data.linkedDelegateName },
                  { label: "Partido político", value: data.linkedDelegatePoliticalPartyName },
                ],
              },
            ]
          : []),
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
      open={!!user}
      onClose={onClose}
      loading={!data}
      error={detailQuery.isError ? getApiErrorMessage(detailQuery.error, "No se pudo cargar el perfil del usuario.") : null}
      avatar={
        data && (
          <UserAvatar
            userId={data.id}
            hasPhoto={!!data.profilePhotoUrl}
            fallbackText={data.fullName.charAt(0).toUpperCase()}
            name={data.fullName}
            size={88}
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
