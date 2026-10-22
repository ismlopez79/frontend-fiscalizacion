import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { activityFormApi } from "@/api/fiscalizacionFasesApi";
import { getApiErrorCode, getApiErrorMessage } from "@/utils/apiError";
import type { AnswerValue, Answers, ActivityFormDto } from "@/types/fiscalizacionFases";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1500;
const MAX_WAIT_MS = 8000;
const RETRY_MS = 5000;

export interface AutosaveConflict {
  message: string;
}

/**
 * Autoguardado del informe compartido. Reglas del backend:
 *  - cada PATCH lleva la foto COMPLETA de answers y la version que se tiene;
 *  - se espera la respuesta de un guardado antes de mandar el siguiente
 *    (un solo request en vuelo; los cambios que llegan mientras tanto se
 *    juntan en el proximo);
 *  - 409 FORM_EDIT_CONFLICT = otro delegado guardo antes: se detiene el
 *    autoguardado y se avisa para recargar. Nunca se reintenta en silencio,
 *    porque eso pisaria lo que escribio el otro.
 * Un error de red si se reintenta solo (no pisa a nadie: la version no cambio).
 */
export function useActivityFormAutosave(activityId: number) {
  const [answers, setAnswers] = useState<Answers>({});
  const [state, setState] = useState<AutosaveState>("idle");
  const [conflict, setConflict] = useState<AutosaveConflict | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const answersRef = useRef<Answers>({});
  const versionRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstChangeAtRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  /** Carga (o recarga) el estado del servidor: descarta cambios locales y reactiva el autoguardado. */
  const reset = useCallback((form: ActivityFormDto) => {
    clearTimer();
    firstChangeAtRef.current = null;
    dirtyRef.current = false;
    conflictRef.current = false;
    versionRef.current = form.version;
    answersRef.current = form.answers ?? {};
    setAnswers(form.answers ?? {});
    setConflict(null);
    setState("idle");
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (conflictRef.current || versionRef.current === null) return;
    if (inFlightRef.current) {
      // Ya hay uno en vuelo: al terminar revisa dirtyRef y manda lo pendiente.
      return inFlightRef.current;
    }
    if (!dirtyRef.current) return;

    const run = (async () => {
      dirtyRef.current = false;
      const snapshot = answersRef.current;
      setState("saving");
      try {
        const res = await activityFormApi.autoguardar(activityId, versionRef.current!, snapshot);
        versionRef.current = res.version;
        setLastSavedAt(new Date());
        setState(dirtyRef.current ? "saving" : "saved");
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 409) {
          conflictRef.current = true;
          clearTimer();
          const message =
            getApiErrorCode(error) === "FORM_EDIT_CONFLICT"
              ? "Otro delegado modificó el informe mientras escribías."
              : getApiErrorMessage(error, "El informe cambió y ya no se puede guardar esta versión.");
          setConflict({ message });
          setState("error");
          return;
        }
        // Red caida o 5xx: lo no guardado vuelve a quedar pendiente y se reintenta.
        dirtyRef.current = true;
        setState("error");
        clearTimer();
        timerRef.current = setTimeout(() => void flush(), RETRY_MS);
      }
    })();

    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
    if (dirtyRef.current && !conflictRef.current && !timerRef.current) {
      await flush();
    }
  }, [activityId]);

  const setAnswer = useCallback(
    (key: string, value: AnswerValue) => {
      if (conflictRef.current) return;
      const next = { ...answersRef.current, [key]: value };
      answersRef.current = next;
      setAnswers(next);
      dirtyRef.current = true;

      clearTimer();
      if (firstChangeAtRef.current === null) firstChangeAtRef.current = Date.now();
      const waited = Date.now() - firstChangeAtRef.current;
      timerRef.current = setTimeout(
        () => {
          timerRef.current = null;
          firstChangeAtRef.current = null;
          void flush();
        },
        waited >= MAX_WAIT_MS ? 0 : DEBOUNCE_MS
      );
    },
    [flush]
  );

  /**
   * Guarda YA lo pendiente y espera a que termine (antes de enviar).
   * true si todo quedo guardado; false si hubo conflicto o error.
   */
  const saveNow = useCallback(async (): Promise<boolean> => {
    clearTimer();
    firstChangeAtRef.current = null;
    while (inFlightRef.current) await inFlightRef.current;
    if (dirtyRef.current) await flush();
    return !conflictRef.current && !dirtyRef.current;
  }, [flush]);

  // Al salir de la pantalla: manda lo pendiente (mejor esfuerzo) y avisa si se cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || inFlightRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimer();
      if (dirtyRef.current && !conflictRef.current) void flush();
    };
  }, [flush]);

  return { answers, setAnswer, state, conflict, lastSavedAt, reset, saveNow };
}
