import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Callout";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { designTokens } from "@/theme/theme";
import { myPhotoApi, useMyAccount } from "@/hooks/useMyAccount";
import { ContactoSection } from "./ContactoSection";
import { ProfileCompletionNotice } from "./ProfileCompletionNotice";
import { CuentaInfoSection } from "./CuentaInfoSection";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfilePhoto } from "@/hooks/useMyProfilePhoto";
import { useToast } from "@/hooks/useToast";
import { shrinkPhoto } from "@/utils/resizeImage";
import { ToastSnackbar } from "@/components/ToastSnackbar";

// Mas estricto que los adjuntos de acta, a proposito: nunca PDF. 10 MB, igual
// que app.file-storage.profile-photo-max-size-mb del backend: una foto de la
// galeria del celular pesa normalmente 3-8 MB y con el tope anterior de 2 MB
// se rechazaba aqui mismo, antes de llegar al servidor.
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];

export function PerfilPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Perfil propio (GET .../me): usuario permanente o delegado temporal segun la sesion.
  const { isTemporary, query: accountQuery, updateMutation } = useMyAccount();
  const account = accountQuery.data;
  const photoApi = myPhotoApi(isTemporary);
  const sharedPhotoUrl = useMyProfilePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // undefined = "sin cambios locales, seguir lo que diga el hook compartido".
  // Tras subir/quitar, se fija a un valor concreto (string | null) para dar
  // feedback inmediato sin depender de que el GET de "mi foto" funcione.
  const [localOverride, setLocalOverride] = useState<string | null | undefined>(undefined);
  const { toast, showToast, closeToast } = useToast();
  const [zoomOpen, setZoomOpen] = useState(false);

  const displayUrl = localOverride !== undefined ? localOverride : sharedPhotoUrl;

  useEffect(() => {
    return () => {
      if (localOverride) URL.revokeObjectURL(localOverride);
    };
  }, [localOverride]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => photoApi.upload(file),
    onSuccess: (_data, file) => {
      setLocalOverride(URL.createObjectURL(file));
      queryClient.invalidateQueries({ queryKey: ["mi-foto-perfil"] });
      // El perfil trae "tiene foto": se relee para que el aviso de perfil obligatorio se actualice.
      queryClient.invalidateQueries({ queryKey: ["mi-cuenta"] });
      showToast("success", "Foto de perfil actualizada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo subir la foto.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => photoApi.remove(),
    onSuccess: () => {
      setLocalOverride(null);
      queryClient.invalidateQueries({ queryKey: ["mi-foto-perfil"] });
      // El perfil trae "tiene foto": se relee para que el aviso de perfil obligatorio se actualice.
      queryClient.invalidateQueries({ queryKey: ["mi-cuenta"] });
      showToast("success", "Foto de perfil eliminada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo eliminar la foto.")),
  });

  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const handleFileSelected = async (original: File | null) => {
    if (!original) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    // La foto se reduce en el navegador antes de subirla (ver shrinkPhoto):
    // asi el peso de la camara o galeria del celular deja de ser un problema.
    // Las validaciones de abajo solo saltan si el navegador no pudo leerla.
    setPreparingPhoto(true);
    const file = await shrinkPhoto(original);
    setPreparingPhoto(false);
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      showToast("error", "No se pudo leer esa imagen. Elige una foto en formato JPG o PNG, o toma una nueva con la cámara.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      showToast("error", "La imagen supera el máximo de 10 MB.");
      return;
    }
    uploadMutation.mutate(file);
  };

  const isBusy = preparingPhoto || uploadMutation.isPending || deleteMutation.isPending;
  // Foto, correo y telefono son obligatorios para todos menos ADMINISTRADOR:
  // sin ellos el backend bloquea la cuenta (PROFILE_INCOMPLETE_REQUIRED).
  const photoRequired = !user?.roles.includes("ADMINISTRADOR");
  // Mientras llega GET .../me se usa lo que ya trae la sesion: sin parpadeo del encabezado.
  const fullName = account?.fullName ?? user?.fullName ?? "";
  const initials = fullName.charAt(0).toUpperCase() || "U";
  const pickPhoto = () => fileInputRef.current?.click();

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ flexShrink: 0, pb: 2, maxWidth: 720, width: "100%", mx: "auto" }}>
      <PageHeader
        title="Mi cuenta"
        subtitle="Tu foto de perfil se muestra en el menú superior y en cualquier pantalla donde otros usuarios te vean (ej. «creada por» en actas)."
      />

      <ProfileCompletionNotice account={account} />

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png"
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
      />

      <Surface sx={{ py: { xs: 3.5, md: 4.5 } }}>
        <Stack alignItems="center" textAlign="center" spacing={1.5}>
          <Box sx={{ position: "relative" }}>
            <ButtonBase
              onClick={() => (displayUrl ? setZoomOpen(true) : pickPhoto())}
              aria-label={displayUrl ? "Ver foto de perfil" : "Subir foto de perfil"}
              sx={{
                borderRadius: "50%",
                cursor: displayUrl ? "zoom-in" : "pointer",
                transition: `transform 160ms ${designTokens.easeOut}`,
                "&:active": { transform: "scale(0.97)" },
                "&.Mui-focusVisible": { boxShadow: designTokens.focusRing },
              }}
            >
              <Avatar
                src={displayUrl ?? undefined}
                alt=""
                sx={{
                  width: 112,
                  height: 112,
                  fontSize: 42,
                  bgcolor: "primary.main",
                  boxShadow: "0 0 0 4px #FFFFFF, 0 12px 32px -12px rgba(15, 23, 42, 0.35)",
                }}
              >
                {initials}
              </Avatar>
              {isBusy && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    bgcolor: "rgba(255, 255, 255, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress size={28} />
                </Box>
              )}
            </ButtonBase>
            <Tooltip title={displayUrl ? "Cambiar foto" : "Subir foto"}>
              <IconButton
                onClick={pickPhoto}
                disabled={isBusy}
                aria-label={displayUrl ? "Cambiar foto de perfil" : "Subir foto de perfil"}
                sx={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 38,
                  height: 38,
                  bgcolor: designTokens.accent,
                  color: "#FFFFFF",
                  boxShadow: "0 0 0 3px #FFFFFF, 0 4px 12px rgba(37, 99, 235, 0.35)",
                  "@media (hover: hover) and (pointer: fine)": { "&:hover": { bgcolor: designTokens.accentHover } },
                  "&.Mui-disabled": { bgcolor: designTokens.textDisabled, color: "#FFFFFF" },
                }}
              >
                <PhotoCameraOutlinedIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ pt: 1 }}>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", color: "text.primary", textWrap: "balance" }}>
              {fullName}
            </Typography>
            <Typography variant="body2">@{account?.username ?? user?.username}</Typography>
          </Box>
          <Stack direction="row" gap={0.75} justifyContent="center" flexWrap="wrap">
            {user?.roles.map((role) => (
              <Chip key={role} label={formatRole(role)} size="small" color="primary" variant="outlined" />
            ))}
          </Stack>
        </Stack>
      </Surface>

      {accountQuery.isError && (
        <Callout tone="error" title="No se pudo cargar tu perfil">
          {getApiErrorMessage(accountQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}
        </Callout>
      )}

      <ContactoSection
        required={photoRequired}
        profile={account}
        loading={accountQuery.isLoading}
        saving={updateMutation.isPending}
        onSave={async (body) => {
          await updateMutation.mutateAsync(body);
          showToast("success", "Datos de contacto actualizados.");
        }}
      />

      <CuentaInfoSection profile={account} loading={accountQuery.isLoading} isTemporary={isTemporary} />

      {/* Lista estilo Ajustes: cada fila es una accion de la cuenta. */}
      <Surface sx={{ py: { xs: 0.5, md: 1 } }}>
        <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(15, 23, 42, 0.06)" }} />}>
          <SettingsRow
            icon={<PhotoCameraOutlinedIcon />}
            title="Foto de perfil"
            hint="JPG o PNG. Se ajusta sola antes de subir."
            action={
              <Stack direction="row" gap={1}>
                {displayUrl && (
                  <Tooltip
                    title={photoRequired ? "La foto es obligatoria: puedes cambiarla, pero no quitarla." : ""}
                  >
                    <span>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        disabled={isBusy || photoRequired}
                        onClick={() => deleteMutation.mutate()}
                      >
                        {deleteMutation.isPending ? "Quitando…" : "Quitar"}
                      </Button>
                    </span>
                  </Tooltip>
                )}
                <Button size="small" variant="outlined" disabled={isBusy} onClick={pickPhoto}>
                  {uploadMutation.isPending ? "Subiendo…" : displayUrl ? "Cambiar" : "Subir foto"}
                </Button>
              </Stack>
            }
          />
          <SettingsRow
            icon={<VpnKeyOutlinedIcon />}
            title="Contraseña"
            hint="Cámbiala cuando quieras; se te pedirá la actual."
            action={
              <Button size="small" variant="outlined" component={RouterLink} to="/cambiar-password" endIcon={<ChevronRightRoundedIcon />}>
                Cambiar
              </Button>
            }
          />
        </Stack>
      </Surface>

      <PhotoLightbox open={zoomOpen} src={displayUrl ?? null} alt="Tu foto de perfil" onClose={() => setZoomOpen(false)} />

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}

/** "DELEGADO_TEMPORAL" -> "Delegado temporal". */
function formatRole(role: string): string {
  const text = role.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function SettingsRow({ icon, title, hint, action }: { icon: ReactNode; title: string; hint: string; action: ReactNode }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      gap={{ xs: 1.5, sm: 2 }}
      sx={{ py: 2.25 }}
    >
      <Stack direction="row" gap={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "11px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: designTokens.accentSoft,
            color: designTokens.accent,
            "& svg": { fontSize: 20 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
            {title}
          </Typography>
          <Typography variant="body2">{hint}</Typography>
        </Box>
      </Stack>
      <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", sm: "flex-end" }, pl: { xs: "50px", sm: 0 } }}>{action}</Box>
    </Stack>
  );
}
