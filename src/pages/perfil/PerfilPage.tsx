import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { userApi } from "@/api/userApi";
import { getApiErrorMessage } from "@/utils/apiError";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfilePhoto } from "@/hooks/useMyProfilePhoto";
import { useToast } from "@/hooks/useToast";
import { ToastSnackbar } from "@/components/ToastSnackbar";

// Mas estricto que los adjuntos de acta, a proposito: nunca PDF, mitad del
// tamaño maximo (ver app.file-storage.profile-photo-* del lado del backend).
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];

export function PerfilPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sharedPhotoUrl = useMyProfilePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // undefined = "sin cambios locales, seguir lo que diga el hook compartido".
  // Tras subir/quitar, se fija a un valor concreto (string | null) para dar
  // feedback inmediato sin depender de que el GET de "mi foto" funcione.
  const [localOverride, setLocalOverride] = useState<string | null | undefined>(undefined);
  const { toast, showToast, closeToast } = useToast();

  const displayUrl = localOverride !== undefined ? localOverride : sharedPhotoUrl;

  useEffect(() => {
    return () => {
      if (localOverride) URL.revokeObjectURL(localOverride);
    };
  }, [localOverride]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadMiFotoPerfil(file),
    onSuccess: (_data, file) => {
      setLocalOverride(URL.createObjectURL(file));
      queryClient.invalidateQueries({ queryKey: ["mi-foto-perfil"] });
      showToast("success", "Foto de perfil actualizada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo subir la foto.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => userApi.eliminarMiFotoPerfil(),
    onSuccess: () => {
      setLocalOverride(null);
      queryClient.invalidateQueries({ queryKey: ["mi-foto-perfil"] });
      showToast("success", "Foto de perfil eliminada.");
    },
    onError: (error) => showToast("error", getApiErrorMessage(error, "No se pudo eliminar la foto.")),
  });

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      showToast("error", "Solo se permiten imágenes JPG o PNG.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      showToast("error", "La imagen supera el máximo de 2 MB.");
      return;
    }
    uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isBusy = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3">Mi cuenta</Typography>
        <Typography variant="body2" color="text.secondary">
          Tu foto de perfil se muestra en el menú superior y en cualquier pantalla donde otros
          usuarios te vean (ej. "creada por" en actas).
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
          <Avatar src={displayUrl ?? undefined} sx={{ width: 96, height: 96, fontSize: 36, bgcolor: "primary.main" }}>
            {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
          </Avatar>

          <Stack spacing={1.5} alignItems={{ xs: "center", sm: "flex-start" }}>
            <Box textAlign={{ xs: "center", sm: "left" }}>
              <Typography variant="h4">{user?.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                @{user?.username}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
                {user?.roles.map((role) => (
                  <Chip key={role} label={role} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                size="small"
                component="label"
                variant="outlined"
                startIcon={<PhotoCameraOutlinedIcon />}
                disabled={isBusy}
              >
                {uploadMutation.isPending ? "Subiendo…" : displayUrl ? "Cambiar foto" : "Subir foto"}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png"
                  onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                />
              </Button>
              {displayUrl && (
                <Button
                  size="small"
                  color="error"
                  variant="text"
                  startIcon={<DeleteOutlineIcon />}
                  disabled={isBusy}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? "Quitando…" : "Quitar foto"}
                </Button>
              )}
            </Stack>

            <Typography variant="caption" color="text.secondary">
              JPG o PNG, máximo 2 MB.
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <ToastSnackbar toast={toast} onClose={closeToast} />
    </Stack>
  );
}
