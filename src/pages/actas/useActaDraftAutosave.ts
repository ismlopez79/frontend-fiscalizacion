import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { actaApi } from "@/api/actaApi";
import { getApiErrorCode } from "@/utils/apiError";
import type { ActaBorradorActivo, ActaDraftSnapshot, ActaResponse } from "@/types/acta";

export type { ActaDraftSnapshot };

export type AutosaveState = "idle" | "saving" | "saved" | "error";

/**
 * Lanzado por finalize() cuando el borrador ya no existe / ya no esta en
 * BORRADOR en el backend (se completo o descarto desde otra sesion) — no
 * hay contenido que mandar. El caller no debe mostrarlo como error
 * generico, ya lo cubre el aviso de `draftGone`.
 */
export class DraftGoneError extends Error {
  constructor() {
    super("El borrador ya no existe — se completo o descarto desde otra sesion.");
    this.name = "DraftGoneError";
  }
}

const AUTOSAVE_DEBOUNCE_MS = 2000;
/** Si el digitador no deja de teclear, fuerza un guardado cada 10s en vez de esperar indefinidamente el silencio. */
const AUTOSAVE_MAX_WAIT_MS = 10000;

function storageKey(username: string): string {
  return `jve_acta_draft_${username}`;
}

function loadLocalSnapshot(username: string): ActaDraftSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(username));
    if (!raw) return null;
    return JSON.parse(raw) as ActaDraftSnapshot;
  } catch {
    return null;
  }
}

function saveLocalSnapshot(username: string, snapshot: ActaDraftSnapshot): void {
  try {
    localStorage.setItem(storageKey(username), JSON.stringify(snapshot));
  } catch {
    // Cuota excedida u otro fallo de localStorage: el autoguardado al
    // backend sigue funcionando igual: esto es solo un respaldo extra.
  }
}

function clearLocalSnapshot(username: string): void {
  try {
    localStorage.removeItem(storageKey(username));
  } catch {
    // no-op
  }
}

function hasMinimumFields(snapshot: ActaDraftSnapshot): boolean {
  return snapshot.departmentId > 0 && snapshot.duicentroId > 0 && !!snapshot.actaDate;
}

/**
 * A diferencia de simplemente mirar departamento/duicentro/fecha (que ya se
 * exigen para poder crear el borrador en el backend, ver hasMinimumFields),
 * esto exige contenido real del acta en si — nunca cuenta como
 * real el placeholder con el que arranca el formulario (una produccion sin
 * fecha, con las categorias por defecto precargadas en cantidad 0). Dos usos:
 * (1) decide CUANDO crear el borrador en el backend — elegir departamento +
 * duicentro + fecha (que ya dispara notifyChange via hasMinimumFields) no
 * debe por si solo crear una fila BORRADOR huerfana si el digitador cierra la
 * pantalla ahi mismo sin llenar nada mas; (2) decide si vale la pena ofrecer
 * "recuperar" un respaldo de LocalStorage — ese respaldo se guarda en CADA
 * cambio del formulario (ver notifyChange), incluyendo el simple hecho de
 * elegir departamento/duicentro/fecha, asi que sin este chequeo el aviso de
 * "tienes un borrador sin terminar" podia reaparecer solo por eso, aunque el
 * backend ya no tuviera ningun borrador real (ver GET
 * /actas/delegado/borrador-activo).
 */
function hasRealContent(snapshot: ActaDraftSnapshot): boolean {
  const c = snapshot.content ?? {};
  const hasProduccionContent = (c.producciones ?? []).some(
    (p) =>
      !!p.productionDate ||
      !!p.observations ||
      p.declaredTotal !== undefined ||
      (p.values ?? []).some((v) => v.quantity > 0)
  );
  const hasIncidenteContent = (c.incidentes ?? []).some((i) => !!i.incidentTypeId || !!i.description);

  return (
    !!c.arrivalTime ||
    !!c.departureTime ||
    !!c.jveDelegateId ||
    !!c.rnpnDelegateId ||
    !!c.rnpnDelegateName ||
    !!c.duicentroChiefId ||
    !!c.duicentroChiefName ||
    !!c.observations ||
    c.declaredTotal !== undefined ||
    hasProduccionContent ||
    hasIncidenteContent
  );
}

function mapActivoToSnapshot(activo: ActaBorradorActivo): ActaDraftSnapshot {
  return {
    departmentId: activo.departmentId,
    duicentroId: activo.duicentroId,
    actaDate: activo.actaDate,
    content: activo.content ?? {},
  };
}

/**
 * Autoguardado last-write-wins: el backend ya no compara version (ver
 * UpdateBorradorRequest). El unico 409 esperable en la practica es que el
 * acta ya no este en BORRADOR (se completo/descarto en otra sesion) —
 * BUSINESS_RULE_VIOLATION. OPTIMISTIC_LOCK_CONFLICT es una carrera de
 * escritura real a nivel de fila (rarisimo, red de seguridad interna del
 * backend) y se resuelve reintentando el mismo guardado una vez, en
 * silencio, sin involucrar al usuario.
 */
function classifyConflict(error: unknown): "retry" | "gone" | null {
  if (!(error instanceof AxiosError) || error.response?.status !== 409) return null;
  return getApiErrorCode(error) === "OPTIMISTIC_LOCK_CONFLICT" ? "retry" : "gone";
}

interface UseActaDraftAutosaveParams {
  /** Username del digitador logueado — separa el respaldo de LocalStorage entre cuentas que comparten navegador. */
  username: string;
  /** false en pantallas donde este flujo no aplica (ej. "editar" una acta ya existente) — evita el GET de borrador-activo y deja todo en no-op. */
  enabled?: boolean;
}

export function useActaDraftAutosave({ username, enabled = true }: UseActaDraftAutosaveParams) {
  const [loadingInitial, setLoadingInitial] = useState(enabled);
  const [initialSnapshot, setInitialSnapshot] = useState<ActaDraftSnapshot | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  /** true si el borrador ya no existe/ya no esta en BORRADOR en el backend. */
  const [draftGone, setDraftGone] = useState(false);

  const draftIdRef = useRef<number | null>(null);
  const latestSnapshotRef = useRef<ActaDraftSnapshot | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPendingChangeAtRef = useRef<number | null>(null);
  const inFlightFlushRef = useRef<Promise<void> | null>(null);
  const pendingRerunRef = useRef(false);

  // Recupera el borrador activo (backend, fuente de verdad) al montar. Si no
  // hay ninguno, cae de vuelta al respaldo de LocalStorage (arranque en
  // blanco si tampoco hay eso).
  useEffect(() => {
    if (!enabled) {
      setLoadingInitial(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const active = await actaApi.getBorradorActivo();
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
        // Sin conexion o error consultando el borrador activo: arranca en
        // blanco, no bloquea la captura — solo se pierde la recuperacion
        // automatica esta vez.
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

    // Elegir departamento + duicentro + fecha ya cumple hasMinimumFields, pero
    // por si solo no debe crear la fila BORRADOR en el backend — eso dejaria
    // un borrador huerfano (sin ninguna produccion/incidente/dato real) apenas
    // el digitador entra a la pantalla, que luego el propio backend le
    // ofreceria "recuperar" en el siguiente login sin que haya nada que
    // recuperar en realidad. Una vez que el borrador YA existe (draftIdRef
    // seteado), el autoguardado si sigue en cada cambio como siempre —esto
    // solo bloquea la creacion inicial.
    if (draftIdRef.current === null && !hasRealContent(snapshot)) return;

    // Nunca dos PATCH/POST de borrador en vuelo a la vez desde esta misma
    // pestaña: si dos llegan al backend en desorden, el que responde
    // ultimo pisa al otro con contenido mas viejo (con o sin chequeo de
    // version — esto es puro orden de llegada). En vez de eso, marcamos
    // que hace falta otra pasada y la disparamos apenas termine la que
    // esta en curso, ya con el snapshot mas reciente (latestSnapshotRef
    // siempre esta al dia, nunca es una copia vieja del momento en que se
    // programo el timer).
    if (inFlightFlushRef.current) {
      pendingRerunRef.current = true;
      return;
    }

    const run = (async () => {
      setAutosaveState("saving");
      try {
        if (draftIdRef.current === null) {
          const res = await actaApi.crearBorrador({
            departmentId: snapshot.departmentId,
            duicentroId: snapshot.duicentroId,
            actaDate: snapshot.actaDate,
            content: snapshot.content,
          });
          draftIdRef.current = res.id;
          setDraftId(res.id);
        } else {
          try {
            await actaApi.autoguardarBorrador(draftIdRef.current, {
              departmentId: snapshot.departmentId,
              duicentroId: snapshot.duicentroId,
              actaDate: snapshot.actaDate,
              content: snapshot.content,
            });
          } catch (error) {
            const kind = classifyConflict(error);
            if (kind === "retry") {
              // Carrera de escritura real a nivel de fila (rarisimo): un
              // solo reintento inmediato, en silencio, mismo contenido.
              await actaApi.autoguardarBorrador(draftIdRef.current, {
                departmentId: snapshot.departmentId,
                duicentroId: snapshot.duicentroId,
                actaDate: snapshot.actaDate,
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
    (snapshot: ActaDraftSnapshot) => {
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

  /**
   * DELETE /actas/{id}/borrador — usado cuando el digitador, al recuperar
   * un borrador sin terminar al entrar a "nueva acta", elige "Descartar" en
   * vez de continuarlo. Best-effort del lado del backend: si el borrador ya
   * no existe o ya no esta en BORRADOR, igual se limpia todo localmente —
   * un borrador huerfano ahi no bloquea nada.
   */
  const discardDraft = useCallback(async (): Promise<void> => {
    const idToDiscard = draftIdRef.current;
    draftIdRef.current = null;
    latestSnapshotRef.current = null;
    setDraftId(null);
    setInitialSnapshot(null);
    clearLocalSnapshot(username);
    if (idToDiscard !== null) {
      try {
        await actaApi.descartarBorrador(idToDiscard);
      } catch {
        // Best-effort — ver comentario arriba.
      }
    }
  }, [username]);

  const finalize = useCallback(
    async (snapshot: ActaDraftSnapshot): Promise<ActaResponse> => {
      setFinalizing(true);
      try {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        firstPendingChangeAtRef.current = null;
        latestSnapshotRef.current = snapshot;

        // Espera cualquier autoguardado en curso — y cualquier reintento
        // encadenado que haya quedado pendiente — antes de mandar el
        // guardado final, para no mandar dos PATCH a la vez.
        while (inFlightFlushRef.current) {
          await inFlightFlushRef.current;
        }
        pendingRerunRef.current = false;

        if (draftIdRef.current === null) {
          const res = await actaApi.crearBorrador({
            departmentId: snapshot.departmentId,
            duicentroId: snapshot.duicentroId,
            actaDate: snapshot.actaDate,
            content: snapshot.content,
          });
          draftIdRef.current = res.id;
          setDraftId(res.id);
        } else {
          try {
            await actaApi.autoguardarBorrador(draftIdRef.current, {
              departmentId: snapshot.departmentId,
              duicentroId: snapshot.duicentroId,
              actaDate: snapshot.actaDate,
              content: snapshot.content,
            });
          } catch (error) {
            const kind = classifyConflict(error);
            if (kind === "retry") {
              await actaApi.autoguardarBorrador(draftIdRef.current, {
                departmentId: snapshot.departmentId,
                duicentroId: snapshot.duicentroId,
                actaDate: snapshot.actaDate,
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

        const acta = await actaApi.finalizarBorrador(draftIdRef.current);
        clearLocalSnapshot(username);
        return acta;
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
