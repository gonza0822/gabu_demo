'use client';

import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { overlayActions } from "@/store/overlaySlice";
import Modal from "@/components/ui/Modal";
import Cross from "@/components/svg/Cross";

type LibroOpt = { idMoextra: string; Descripcion: string | null };

export default function RestartSimulation(): React.ReactElement {
    const dispatch = useDispatch();
    const client = useSelector((state: RootState) => state.authorization.client);
    const isOpen = useSelector((state: RootState) => state.overlay.restartSimulationOpen);
    const [libros, setLibros] = useState<LibroOpt[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [loadingLibros, setLoadingLibros] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const close = useCallback(() => {
        dispatch(overlayActions.closeRestartSimulation());
    }, [dispatch]);

    const tryClose = useCallback(() => {
        if (submitting) return;
        close();
    }, [submitting, close]);

    useEffect(() => {
        if (!client) return;
        let cancelled = false;
        (async () => {
            setLoadingLibros(true);
            setLoadError(null);
            setSuccessMsg(null);
            setSubmitError(null);
            try {
                const res = await fetch("/api/simulations/restart", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ petition: "GetLibros", client }),
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data?.message ?? `Error ${res.status}`);
                }
                if (!cancelled && Array.isArray(data)) {
                    setLibros(data);
                    if (data.length > 0) {
                        const ml = data.find((x) => (x.idMoextra ?? "").toLowerCase() === "ml");
                        setSelectedId(ml ? ml.idMoextra : data[0].idMoextra);
                    }
                }
            } catch (e) {
                if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
            } finally {
                if (!cancelled) setLoadingLibros(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [client]);

    const handleReiniciar = async () => {
        if (!client || !selectedId) {
            setSubmitError("Seleccione un libro origen.");
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        setSuccessMsg(null);
        try {
            const res = await fetch("/api/simulations/restart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "Reiniciar",
                    client,
                    data: { idMoextra: selectedId },
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message ?? `Error ${res.status}`);
            }
            setSuccessMsg("Se reinició la simulación con éxito.");
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : String(e));
        } finally {
            setSubmitting(false);
        }
    };

    const optionLabel = (l: LibroOpt): string => {
        const id = l.idMoextra ?? "";
        const desc = (l.Descripcion ?? "").trim();
        const isMl = id.toLowerCase() === "ml";
        if (isMl) {
            return desc || "MONEDALOCAL";
        }
        return desc || id;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-auto">
            <Modal
                isOpen={isOpen}
                blockDismissal={submitting}
                style="w-[32rem] max-w-[95vw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gabu-100 border border-gabu-900 rounded-2xl p-5 shadow-xl backdrop:bg-gabu-900/40"
            >
                <div className="flex justify-end -mt-2 -mr-2">
                    <button
                        type="button"
                        onClick={tryClose}
                        disabled={submitting}
                        className={`p-1 rounded transition-colors ${submitting ? "opacity-40 cursor-not-allowed" : "hover:bg-gabu-300"}`}
                        aria-label="Cerrar"
                    >
                        <Cross style="h-5 w-5 fill-current text-gabu-900 cursor-pointer" onClick={tryClose} />
                    </button>
                </div>

                <div className="flex flex-col gap-4 px-2 pb-2">
                    <h2 className="font-semibold text-gabu-900 text-xl text-center">Reiniciar simulación</h2>

                    <p className="text-gabu-error text-xs font-medium bg-gabu-error/10 border border-gabu-error/30 rounded-md px-3 py-2">
                        Advertencia: se borrará todo lo que haya en la simulación y se perderán esos cambios. Esta acción no se puede deshacer.
                    </p>

                    {loadError && (
                        <p className="text-sm text-red-700">{loadError}</p>
                    )}

                    {submitting && (
                        <p className="text-sm text-gabu-800 font-medium">Reiniciando… por favor espere. No cierre esta ventana.</p>
                    )}

                    {loadingLibros ? (
                        <p className="text-sm text-gabu-700">Cargando libros…</p>
                    ) : libros.length === 0 ? (
                        <p className="text-sm text-gabu-700">No hay libros disponibles para usar como origen.</p>
                    ) : (
                        <label className="flex flex-col gap-1 text-sm text-gabu-900">
                            <span className="font-medium">Libro origen</span>
                            <select
                                className="border border-gabu-900 rounded-md px-3 py-2 bg-gabu-100 text-gabu-900 disabled:opacity-60"
                                value={selectedId}
                                disabled={submitting}
                                onChange={(e) => setSelectedId(e.target.value)}
                            >
                                {libros.map((l) => (
                                    <option key={l.idMoextra} value={l.idMoextra}>
                                        {optionLabel(l)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    {submitError && <p className="text-sm text-red-700">{submitError}</p>}
                    {successMsg && <p className="text-sm text-green-800">{successMsg}</p>}

                    <div className="flex gap-3 justify-center flex-wrap pt-2">
                        <button
                            type="button"
                            className="font-normal text-gabu-100 px-6 py-1.5 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={tryClose}
                            disabled={submitting}
                        >
                            Cerrar
                        </button>
                        <button
                            type="button"
                            className="font-normal text-gabu-100 px-6 py-1.5 bg-red-700 rounded-md hover:bg-red-600 cursor-pointer transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleReiniciar}
                            disabled={submitting || loadingLibros || libros.length === 0 || !selectedId}
                        >
                            {submitting ? "Reiniciando…" : "Reiniciar"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
