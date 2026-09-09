import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { fiscalizationFormApi } from "@/api/fiscalizationFormApi";
import { getApiErrorCode } from "@/utils/apiError";
import type {
  FiscalizationBorradorActivo,
  FiscalizationDraftSnapshot,
  FiscalizationFormResponse,
} from "@/types/fiscalizacionForm";

export type { FiscalizationDraftSnapshot };

export type AutosaveState = "idle" | "saving" | "saved" | "error";

/**
 * Mismo diseño que useActaDraftAutosave (ver esa version para el detalle de
 * cada decision) — el formulario de fiscalizacion reusa literalmente la
 * misma maquina de estados y estrategia last-write-wins del backend.
 */
export class DraftGoneError extends Error {
  constructor() {
    super("El borrador ya no existe — se completó o descartó desde otra sesión.");
    this.name = "DraftGoneError";
  }
}

const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_MAX_WAIT_MS = 10000;

function storageKey(username: string): string {
  return `jve_fiscalizacion_draft_${username}`;
}

function loadLocalSnapshot(username: string): FiscalizationDraftSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(username));
    if (!raw) return null;
    return JSON.parse(raw) as FiscalizationDraftSnapshot;
  } catch {
    return null;
  }
}

function saveLocalSnapshot(username: string, snapshot: FiscalizationDraftSnapshot): void {
  try {
    localStorage.setItem(storageKey(username), JSON.stringify(snapshot));
  } catch {
    // Cuota excedida u otro fallo de localStorage — el autoguardado al backend sigue funcionando igual.
  }
}

function clearLocalSnapshot(username: string): void {
  try {
    localStorage.removeItem(storageKey(username));
  } catch {
    // no-op
  }
}

function hasMinimumFields(snapshot: FiscalizationDraftSnapshot): boolean {
  return snapshot.serviceCenterId > 0 && !!snapshot.formDate;
}

/**
 * Igual criterio que actas: elegir centro + fecha ya cumple
 * hasMinimumFields, pero por si solo no debe crear la fila BORRADOR en el
 * backend — eso dejaria un borrador huerfano apenas el delegado entra a la
 * pantalla. "Contenido real" es cualquier dato del checklist u observaciones.
 */
function hasRealContent(snapshot: FiscalizationDraftSnapshot): boolean {
  const c = snapshot.content ?? {};
  const hasRespuestas = (c.respuestas ?? []).some((r) => !!r.answer);
  return !!c.arrivalTime || !!c.departureTime || !!c.observations || hasRespuestas;
}

function mapActivoToSnapshot(activo: FiscalizationBorradorActivo): FiscalizationDraftSnapshot {
  return {
    serviceCenterId: activo.serviceCenterId,
    formDate: activo.formDate,
    content: activo.content ?? {},
  };
}

function classifyConflict(error: unknown): "retry" | "gone" | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 409) return null;
  return getApiErrorCode(error) === "OPTIMISTIC_LOCK_CONFLICT" ? "retry" : "gone";
}

interface UseFiscalizacionDraftAutosaveParams {
  /** Username del delegado logueado — separa el respaldo de LocalStorage entre cuentas que comparten navegador. */
  username: string;
  enabled?: boolean;
}

export function useFiscalizacionDraftAutosave({ username, enabled = true }: UseFiscalizacionDraftAutosaveParams) {
  const [loadingInitial, setLoadingInitial] = useState(enabled);
  const [initialSnapshot, setInitialSnapshot] = useState<FiscalizationDraftSnapshot | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [draftGone, setDraftGone] = useState(false);

  const draftIdRef = useRef<number | null>(null);
  const latestSnapshotRef = useRef<FiscalizationDraftSnapshot | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPendingChangeAtRef = useRef<number | null>(null);
  const inFlightFlushRef = useRef<Promise<void> | null>(null);
  const pendingRerunRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setLoadingInitial(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const active = await fiscalizationFormApi.getBorradorActivo();
        if (cancelled) return;
        if (active) {
          draftIdRef.current = active.id;
          setDraftId(active.id);
          const snapshot = mapActivoToSnapshot(active);
          saveLocalSnapshot(username, snapshot);
          setInitialSnapshot(snapshot);
        } else {
          const local = loadLocalSnapshot(username);
          if (local && hasRealContent(local)) {
            setInitialSnapshot(local);
          }
        }
      } catch {
        // Sin conexion o error consultando el borrador activo: arranca en blanco.
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, enabled]);

  const markDraftGone = useCallback(() => {
    draftIdRef.current = null;
    setDraftId(null);
    clearLocalSnapshot(username);
    setDraftGone(true);
  }, [username]);

  const flush = useCallback(async (): Promise<void> => {
    const snapshot = latestSnapshotRef.current;
    if (!snapshot || !hasMinimumFields(snapshot)) return;

    if (draftIdRef.current === null && !hasRealContent(snapshot)) return;

    if (inFlightFlushRef.current) {
      pendingRerunRef.current = true;
      return;
    }

    const run = (async () => {
      setAutosaveState("saving");
      try {
        if (draftIdRef.current === null) {
          const res = await fiscalizationFormApi.crearBorrador({
            serviceCenterId: snapshot.serviceCenterId,
            formDate: snapshot.formDate,
            content: snapshot.content,
          });
          draftIdRef.current = res.id;
          setDraftId(res.id);
        } else {
          try {
            await fiscalizationFormApi.autoguardarBorrador(draftIdRef.current, {
              serviceCenterId: snapshot.serviceCenterId,
              formDate: snapshot.formDate,
              content: snapshot.content,
            });
          } catch (error) {
            const kind = classifyConflict(error);
            if (kind === "retry") {
              await fiscalizationFormApi.autoguardarBorrador(draftIdRef.current, {
                serviceCenterId: snapshot.serviceCenterId,
                formDate: snapshot.formDate,
                content: snapshot.content,
              });
            } else if (kind === "gone") {
              markDraftGone();
              throw error;
            } else {
              throw error;
            }
          }
        }
        setAutosaveState("saved");
        setLastSavedAt(new Date());
      } catch {
        setAutosaveState("error");
      }
    })();

    inFlightFlushRef.current = run;
    try {
      await run;
    } finally {
      inFlightFlushRef.current = null;
      if (pendingRerunRef.current) {
        pendingRerunRef.current = false;
        void flush();
      }
    }
  }, [markDraftGone]);

  const notifyChange = useCallback(
    (snapshot: FiscalizationDraftSnapshot) => {
      if (!enabled) return;
      saveLocalSnapshot(username, snapshot);
      latestSnapshotRef.current = snapshot;

      if (!hasMinimumFields(snapshot)) return;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (firstPendingChangeAtRef.current === null) {
        firstPendingChangeAtRef.current = Date.now();
      }

      const elapsed = Date.now() - firstPendingChangeAtRef.current;
      const delay = elapsed >= AUTOSAVE_MAX_WAIT_MS ? 0 : AUTOSAVE_DEBOUNCE_MS;

      debounceTimerRef.current = setTimeout(() => {
        firstPendingChangeAtRef.current = null;
        void flush();
      }, delay);
    },
    [flush, username, enabled]
  );

  const discardDraft = useCallback(async (): Promise<void> => {
    const idToDiscard = draftIdRef.current;
    draftIdRef.current = null;
    latestSnapshotRef.current = null;
    setDraftId(null);
    setInitialSnapshot(null);
    clearLocalSnapshot(username);
    if (idToDiscard !== null) {
      try {
        await fiscalizationFormApi.descartarBorrador(idToDiscard);
      } catch {
        // Best-effort — un borrador huerfano ahi no bloquea nada.
      }
    }
  }, [username]);

  const finalize = useCallback(
    async (snapshot: FiscalizationDraftSnapshot): Promise<FiscalizationFormResponse> => {
      setFinalizing(true);
      try {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        firstPendingChangeAtRef.current = null;
        latestSnapshotRef.current = snapshot;

        while (inFlightFlushRef.current) {
          await inFlightFlushRef.current;
        }
        pendingRerunRef.current = false;

        if (draftIdRef.current === null) {
          const res = await fiscalizationFormApi.crearBorrador({
            serviceCenterId: snapshot.serviceCenterId,
            formDate: snapshot.formDate,
            content: snapshot.content,
          });
          draftIdRef.current = res.id;
          setDraftId(res.id);
        } else {
          try {
            await fiscalizationFormApi.autoguardarBorrador(draftIdRef.current, {
              serviceCenterId: snapshot.serviceCenterId,
              formDate: snapshot.formDate,
              content: snapshot.content,
            });
          } catch (error) {
            const kind = classifyConflict(error);
            if (kind === "retry") {
              await fiscalizationFormApi.autoguardarBorrador(draftIdRef.current, {
                serviceCenterId: snapshot.serviceCenterId,
                formDate: snapshot.formDate,
                content: snapshot.content,
              });
            } else if (kind === "gone") {
              markDraftGone();
              throw new DraftGoneError();
            } else {
              throw error;
            }
          }
        }

        const form = await fiscalizationFormApi.finalizarBorrador(draftIdRef.current);
        clearLocalSnapshot(username);
        return form;
      } finally {
        setFinalizing(false);
      }
    },
    [markDraftGone, username]
  );

  return {
    loadingInitial,
    initialSnapshot,
    draftId,
    autosaveState,
    lastSavedAt,
    finalizing,
    draftGone,
    notifyChange,
    discardDraft,
    finalize,
  };
}
