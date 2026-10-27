import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineRounded";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import { activityFormPhotoApi } from "@/api/fiscalizacionFasesApi";
import { getApiErrorCode, getApiErrorMessage, getBlobApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";
import { formatDateTime } from "@/utils/dateFormat";
import { shrinkPhoto } from "@/utils/resizeImage";
import { SectionHeader, Surface } from "@/components/ui/Surface";
import { ConfirmacionAccion } from "@/components/ConfirmacionAccion";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { designTokens } from "@/theme/theme";
import type { ActivityFormPhotoDto } from "@/types/fiscalizacionFases";

/** Mismos limites que valida el backend. */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
const DESCRIPTION_MAX = 300;
const DESCRIPTION_DEBOUNCE_MS = 1000;

export const formPhotosKey = (activityId: number) => ["actividades", activityId, "formulario", "fotos"] as const;

/** Id del bloque, para llevar a la persona hasta aqui cuando faltan fotos. */
export const PHOTOS_SECTION_ID = "anexo-fotografico";

/**
 * Lista de fotos del informe en su propia query: el formulario NO se toca al
 * subir o borrar, porque recargarlo reiniciaria el autoguardado y pisaria lo
 * que la persona esta escribiendo. Arranca con las fotos que trae el
 * formulario y se reemplaza cada vez que llega un formulario nuevo.
 */
export function useFormPhotos(activityId: number, initial: ActivityFormPhotoDto[] | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (initial) queryClient.setQueryData(formPhotosKey(activityId), initial);
  }, [activityId, initial, queryClient]);

  return useQuery({
    queryKey: formPhotosKey(activityId),
    queryFn: () => activityFormPhotoApi.getFotos(activityId),
    enabled,
    initialData: initial,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

interface PendingUpload {
  tempId: string;
  previewUrl: string;
  progress: number;
}

/**
 * Deja la foto lista para el backend: si no es JPG/PNG (ej. WEBP) o pasa de
 * 25 MB, se reduce y convierte en el navegador. Si aun asi no sirve, devuelve
 * el motivo. Lo que ya cumple se sube tal cual: el original es el que se
 * descarga despues.
 */
async function prepareFile(file: File): Promise<File | string> {
  let out = file;
  if (!ACCEPTED_TYPES.includes(out.type) || out.size > MAX_BYTES) out = await shrinkPhoto(out);
  if (!ACCEPTED_TYPES.includes(out.type)) return `"${file.name}" no es una foto JPG o PNG.`;
  if (out.size > MAX_BYTES) return `"${file.name}" pesa más de 25 MB.`;
  return out;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

interface FotosActividadProps {
  activityId: number;
  photos: ActivityFormPhotoDto[];
  loading?: boolean;
  minPhotos: number;
  maxPhotos: number;
  /** Informe editable (BORRADOR, OBSERVADA o RECHAZADA) y la persona puede llenarlo. */
  editable: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  /** 409 FORM_ALREADY_SUBMITTED: otro delegado envio el informe; la pantalla lo recarga en solo lectura. */
  onFormLocked?: (message: string) => void;
  showToast: (type: "success" | "error", message: string) => void;
}

export function FotosActividad({
  activityId,
  photos,
  loading,
  minPhotos,
  maxPhotos,
  editable,
  onUploadingChange,
  onFormLocked,
  showToast,
}: FotosActividadProps) {
  const queryClient = useQueryClient();
  const isTouch = useMediaQuery("(pointer: coarse)");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [toDelete, setToDelete] = useState<ActivityFormPhotoDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  const uploading = pending.length > 0;
  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  // Libera las vistas previas locales si se sale de la pantalla a media subida.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const setPhotos = useCallback(
    (update: (prev: ActivityFormPhotoDto[]) => ActivityFormPhotoDto[]) =>
      queryClient.setQueryData<ActivityFormPhotoDto[]>(formPhotosKey(activityId), (prev) => update(prev ?? [])),
    [activityId, queryClient]
  );
  const refetchPhotos = useCallback(
    () => queryClient.invalidateQueries({ queryKey: formPhotosKey(activityId), exact: true }),
    [activityId, queryClient]
  );
  /** true si el error fue que ya enviaron el informe (lo maneja la pantalla, sin toast). */
  const handleLocked = useCallback(
    (error: unknown) => {
      if (getApiErrorCode(error) !== "FORM_ALREADY_SUBMITTED") return false;
      onFormLocked?.(getApiErrorMessage(error, "Este informe ya fue enviado."));
      return true;
    },
    [onFormLocked]
  );

  const total = photos.length + pending.length;
  const remaining = Math.max(0, maxPhotos - total);
  const canAdd = editable && remaining > 0;

  const handleFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const accepted = files.slice(0, remaining);
    if (files.length > accepted.length) {
      showToast(
        "error",
        accepted.length === 0
          ? `Ya se adjuntó el máximo de ${maxPhotos} fotos.`
          : `Solo se agregarán ${plural(accepted.length, "foto", "fotos")}: el máximo es ${maxPhotos}.`
      );
    }

    // Una por una: con mala señal, varias subidas a la vez se estorban y fallan todas.
    const queued = accepted.map((file) => ({
      file,
      item: { tempId: `${Date.now()}-${Math.random()}`, previewUrl: URL.createObjectURL(file), progress: 0 },
    }));
    setPending((prev) => [...prev, ...queued.map((q) => q.item)]);

    let uploaded = 0;
    for (const { file, item } of queued) {
      const drop = () => {
        URL.revokeObjectURL(item.previewUrl);
        setPending((prev) => prev.filter((p) => p.tempId !== item.tempId));
      };
      const ready = await prepareFile(file);
      if (typeof ready === "string") {
        showToast("error", ready);
        drop();
        continue;
      }
      try {
        const photo = await activityFormPhotoApi.subir(activityId, ready, undefined, (fraction) =>
          setPending((prev) => prev.map((p) => (p.tempId === item.tempId ? { ...p, progress: fraction } : p)))
        );
        setPhotos((prev) => (prev.some((p) => p.id === photo.id) ? prev : [...prev, photo]));
        uploaded++;
      } catch (error) {
        if (handleLocked(error)) {
          // Lo que quedaba en la fila ya no se puede subir.
          for (const rest of queued) URL.revokeObjectURL(rest.item.previewUrl);
          setPending([]);
          return;
        }
        showToast("error", getApiErrorMessage(error, `No se pudo subir "${file.name}".`));
        // Puede que otro delegado haya llenado el cupo o enviado el informe: se trae la lista real.
        if (error instanceof AxiosError && error.response?.status === 409) void refetchPhotos();
      } finally {
        drop();
      }
    }
    if (uploaded > 0) showToast("success", uploaded === 1 ? "Foto agregada." : `${uploaded} fotos agregadas.`);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    void handleFiles(files);
    // Permite volver a elegir la misma foto despues de borrarla.
    e.target.value = "";
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await activityFormPhotoApi.eliminar(toDelete.id);
      setPhotos((prev) => prev.filter((p) => p.id !== toDelete.id));
      queryClient.removeQueries({ queryKey: ["foto-actividad", toDelete.id] });
      showToast("success", "Foto eliminada.");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        // Ya la habia borrado otro delegado.
        setPhotos((prev) => prev.filter((p) => p.id !== toDelete.id));
      } else if (!handleLocked(error)) {
        showToast("error", getApiErrorMessage(error, "No se pudo eliminar la foto."));
        void refetchPhotos();
      }
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const missing = Math.max(0, minPhotos - photos.length);
  const subtitle = editable
    ? `${photos.length} de ${maxPhotos} · ${
        missing > 0 ? `falta${missing === 1 ? "" : "n"} ${plural(missing, "foto", "fotos")} para poder enviar` : "JPG o PNG de hasta 25 MB"
      }`
    : photos.length > 0
      ? plural(photos.length, "foto", "fotos")
      : undefined;

  const addButtons = (size: "small" | "medium") => (
    <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
      {isTouch && (
        <Button
          variant={size === "medium" ? "contained" : "outlined"}
          size={size}
          startIcon={<PhotoCameraOutlinedIcon />}
          onClick={() => cameraInputRef.current?.click()}
          disabled={!canAdd}
        >
          Tomar foto
        </Button>
      )}
      <Button
        variant={size === "medium" && !isTouch ? "contained" : "outlined"}
        size={size}
        startIcon={<AddPhotoAlternateOutlinedIcon />}
        onClick={() => galleryInputRef.current?.click()}
        disabled={!canAdd}
      >
        {isTouch ? "Galería" : "Agregar fotos"}
      </Button>
    </Stack>
  );

  return (
    <Surface sx={{ containerType: "inline-size", scrollMarginTop: 16 }}>
      <Box id={PHOTOS_SECTION_ID} tabIndex={-1} sx={{ outline: "none" }}>
        <SectionHeader
          title="Anexo fotográfico"
          subtitle={
            subtitle && (
              <Box
                component="span"
                sx={{
                  fontVariantNumeric: "tabular-nums",
                  color: editable && missing > 0 ? designTokens.status.warning.fg : undefined,
                }}
              >
                {subtitle}
              </Box>
            )
          }
          actions={editable && total > 0 && remaining > 0 ? addButtons("small") : undefined}
        />
      </Box>

      {editable && (
        <>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={onInputChange} />
          <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={onInputChange} />
        </>
      )}

      {loading && photos.length === 0 ? (
        <PhotoGrid>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ aspectRatio: "4 / 3", height: "auto", borderRadius: "14px" }} />
          ))}
        </PhotoGrid>
      ) : total === 0 ? (
        editable ? (
          <Stack
            alignItems="center"
            gap={1.25}
            sx={{
              py: { xs: 3.5, md: 4.5 },
              px: 2,
              textAlign: "center",
              borderRadius: "16px",
              border: `1.5px dashed ${designTokens.cardBorder}`,
              bgcolor: "rgba(15, 23, 42, 0.015)",
            }}
          >
            <Typography sx={{ fontWeight: 700, color: "text.primary" }}>Agrega fotos de la actividad</Typography>
            <Typography variant="body2" sx={{ maxWidth: 420 }}>
              {minPhotos > 0
                ? `Se necesita al menos ${plural(minPhotos, "foto", "fotos")} para enviar el informe. Van en el PDF, al final, con su descripción.`
                : "Van en el PDF, al final, con su descripción."}
            </Typography>
            <Box sx={{ mt: 0.5 }}>{addButtons("medium")}</Box>
          </Stack>
        ) : (
          <Typography variant="body2">No se adjuntaron fotos.</Typography>
        )
      ) : (
        <PhotoGrid>
          {photos.map((photo, index) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              index={index}
              editable={editable}
              onZoom={(src) => setZoom({ src, alt: photo.description || `Foto ${index + 1}` })}
              onDelete={() => setToDelete(photo)}
              onSaved={(next) => setPhotos((prev) => prev.map((p) => (p.id === next.id ? next : p)))}
              onGone={(error) => {
                if (!handleLocked(error)) void refetchPhotos();
              }}
              showToast={showToast}
            />
          ))}
          {pending.map((p) => (
            <PendingTile key={p.tempId} upload={p} />
          ))}
        </PhotoGrid>
      )}

      {editable && total > 0 && remaining === 0 && (
        <Typography variant="caption" component="p" sx={{ mt: 1.5 }}>
          Se alcanzó el máximo de {maxPhotos} fotos. Borra una para agregar otra.
        </Typography>
      )}

      <PhotoLightbox open={!!zoom} src={zoom?.src ?? null} alt={zoom?.alt ?? ""} shape="rect" onClose={() => setZoom(null)} />
      <ConfirmacionAccion
        open={!!toDelete}
        titulo="Eliminar foto"
        descripcion="La foto se quitará del informe para todo el equipo."
        variant="destructive"
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </Surface>
  );
}

function PhotoGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: "1fr",
        "@container (min-width: 420px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
        "@container (min-width: 720px)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
      }}
    >
      {children}
    </Box>
  );
}

const frameSx = {
  position: "relative",
  display: "block",
  width: "100%",
  aspectRatio: "4 / 3",
  borderRadius: "14px",
  overflow: "hidden",
  bgcolor: "rgba(15, 23, 42, 0.05)",
} as const;

function NumberBadge({ n }: { n: number }) {
  return (
    <Box
      component="span"
      sx={{
        position: "absolute",
        top: 8,
        left: 8,
        px: 1,
        py: 0.25,
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        color: "#fff",
        bgcolor: "rgba(15, 23, 42, 0.62)",
        backdropFilter: "blur(4px)",
      }}
    >
      Foto {n}
    </Box>
  );
}

/** Miniatura autenticada: se pide la copia reducida como blob y se cachea por id. */
function usePhotoUrl(photoId: number) {
  const query = useQuery({
    queryKey: ["foto-actividad", photoId],
    queryFn: () => activityFormPhotoApi.ver(photoId),
    staleTime: Infinity,
    retry: 1,
  });
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!query.data) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(query.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);
  return { url, isError: query.isError };
}

interface PhotoTileProps {
  photo: ActivityFormPhotoDto;
  index: number;
  editable: boolean;
  onZoom: (src: string) => void;
  onDelete: () => void;
  onSaved: (photo: ActivityFormPhotoDto) => void;
  onGone: (error: unknown) => void;
  showToast: FotosActividadProps["showToast"];
}

function PhotoTile({ photo, index, editable, onZoom, onDelete, onSaved, onGone, showToast }: PhotoTileProps) {
  const { url, isError } = usePhotoUrl(photo.id);
  const [downloading, setDownloading] = useState(false);
  const label = `Foto ${index + 1}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await activityFormPhotoApi.descargar(photo.id);
      downloadBlob(blob, photo.originalName || `${label}.jpg`);
    } catch (error) {
      showToast("error", await getBlobApiErrorMessage(error, "No se pudo descargar la foto."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <ButtonBase
        onClick={() => url && onZoom(url)}
        disabled={!url}
        aria-label={`Ampliar ${label.toLowerCase()}`}
        sx={{ ...frameSx, borderRadius: "14px", "&:focus-visible": { boxShadow: designTokens.focusRing }, cursor: url ? "zoom-in" : "default" }}
      >
        {url ? (
          <Box component="img" src={url} alt={photo.description || label} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : isError ? (
          <Stack alignItems="center" justifyContent="center" gap={0.5} sx={{ position: "absolute", inset: 0, color: designTokens.textCaption }}>
            <BrokenImageOutlinedIcon />
            <Typography variant="caption">No se pudo cargar</Typography>
          </Stack>
        ) : (
          <Skeleton variant="rectangular" animation="wave" sx={{ position: "absolute", inset: 0, height: "100%" }} />
        )}
        <NumberBadge n={index + 1} />
      </ButtonBase>

      {editable ? (
        <DescriptionField photo={photo} label={label} onSaved={onSaved} onGone={onGone} />
      ) : (
        photo.description && (
          <Typography variant="body2" sx={{ color: "text.primary", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
            {photo.description}
          </Typography>
        )
      )}

      <Stack direction="row" alignItems="center" gap={0.5}>
        <Typography variant="caption" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {photo.uploadedByName} · {formatDateTime(photo.uploadedAt)}
        </Typography>
        <Tooltip title="Descargar original">
          <span>
            <IconButton size="small" aria-label={`Descargar original de ${label.toLowerCase()}`} onClick={handleDownload} disabled={downloading}>
              {downloading ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        {editable && (
          <Tooltip title="Eliminar">
            <IconButton size="small" aria-label={`Eliminar ${label.toLowerCase()}`} onClick={onDelete} sx={{ "&:hover": { color: designTokens.status.error.fg } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}

type DescriptionState = "idle" | "saving" | "saved" | "error";

/**
 * Descripcion con guardado propio (PATCH por foto, con espera breve tras dejar
 * de escribir y al salir del campo). Independiente del autoguardado del
 * informe: no lleva version y no puede chocar con otro delegado.
 */
function DescriptionField({
  photo,
  label,
  onSaved,
  onGone,
}: {
  photo: ActivityFormPhotoDto;
  label: string;
  onSaved: (photo: ActivityFormPhotoDto) => void;
  onGone: (error: unknown) => void;
}) {
  const [value, setValue] = useState(photo.description ?? "");
  const [state, setState] = useState<DescriptionState>("idle");
  const savedRef = useRef(photo.description ?? "");
  const valueRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const focusedRef = useRef(false);

  // Si la lista se recarga (ej. otro delegado la cambio), se adopta lo del servidor salvo mientras se escribe.
  useEffect(() => {
    const server = photo.description ?? "";
    if (!focusedRef.current && valueRef.current === savedRef.current && server !== savedRef.current) {
      savedRef.current = server;
      valueRef.current = server;
      setValue(server);
    }
  }, [photo.description]);

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (inFlightRef.current) return;
    const next = valueRef.current.trim();
    if (next === savedRef.current.trim()) return;

    inFlightRef.current = true;
    setState("saving");
    try {
      const updated = await activityFormPhotoApi.actualizarDescripcion(photo.id, next);
      savedRef.current = updated.description ?? next;
      onSaved(updated);
      setState("saved");
    } catch (error) {
      setState("error");
      if (error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 409)) onGone(error);
    } finally {
      inFlightRef.current = false;
    }
    // Lo que se escribio mientras guardaba sale en el siguiente.
    if (valueRef.current.trim() !== savedRef.current.trim()) void flush();
  }, [photo.id, onSaved, onGone]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (valueRef.current.trim() !== savedRef.current.trim()) void flush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const helper =
    state === "saving"
      ? "Guardando…"
      : state === "error"
        ? "No se guardó. Sal del campo para reintentar."
        : state === "saved"
          ? "Guardado"
          : value.length > DESCRIPTION_MAX - 50
            ? `${value.length}/${DESCRIPTION_MAX}`
            : " ";

  return (
    <TextField
      size="small"
      fullWidth
      multiline
      maxRows={4}
      placeholder="Descripción (opcional)"
      inputProps={{ maxLength: DESCRIPTION_MAX, "aria-label": `Descripción de ${label.toLowerCase()}` }}
      value={value}
      error={state === "error"}
      helperText={helper}
      FormHelperTextProps={{ sx: { mx: 0.25, fontVariantNumeric: "tabular-nums" } }}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        void flush();
      }}
      onChange={(e) => {
        valueRef.current = e.target.value;
        setValue(e.target.value);
        if (state === "saved" || state === "error") setState("idle");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void flush(), DESCRIPTION_DEBOUNCE_MS);
      }}
    />
  );
}

function PendingTile({ upload }: { upload: PendingUpload }) {
  return (
    <Stack spacing={1} sx={{ minWidth: 0 }} aria-busy="true">
      <Box sx={frameSx}>
        <Box component="img" src={upload.previewUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.55 }} />
        <Stack alignItems="center" justifyContent="center" sx={{ position: "absolute", inset: 0 }}>
          <Box sx={{ px: 1.25, py: 0.5, borderRadius: "999px", bgcolor: "rgba(15, 23, 42, 0.62)", color: "#fff", fontSize: "0.75rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {upload.progress > 0 ? `Subiendo ${Math.round(upload.progress * 100)}%` : "Preparando…"}
          </Box>
        </Stack>
        <LinearProgress
          variant={upload.progress > 0 ? "determinate" : "indeterminate"}
          value={upload.progress * 100}
          sx={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3 }}
        />
      </Box>
    </Stack>
  );
}
