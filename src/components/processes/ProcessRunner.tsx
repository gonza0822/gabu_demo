'use client';

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { usePathname } from "next/navigation";
import { navActions, type Menu } from "@/store/navSlice";
import { openPagesActions } from "@/store/openPagesSlice";

type Estado = "Pendiente" | "Ejecutando" | "OK" | "Error";

type ProcessRow = {
    idMoextra: string;
    nombretabla: string;
    clave: string;
    fecini: string | null;
    fecpro: string | null;
    fecant: string | null;
    procesa: boolean;
    alterna: boolean;
};

type ProcessMode = "amortizacion" | "generacion-asientos" | "cierre-mensual" | "cierre-ejercicio";

const modeConfig: Record<
    ProcessMode,
    {
        title: string;
        petition: "RunCalculoAmortizacion" | "RunGeneracionAsientos" | "RunCierreMensual" | "RunCierreEjercicio";
        shouldProcessRow: (row: ProcessRow) => boolean;
    }
> = {
    amortizacion: {
        title: "Calculo de amortizaciones",
        petition: "RunCalculoAmortizacion",
        shouldProcessRow: (row) => row.procesa,
    },
    "generacion-asientos": {
        title: "Generacion de asientos",
        petition: "RunGeneracionAsientos",
        shouldProcessRow: (row) => row.procesa,
    },
    "cierre-mensual": {
        title: "Cierre mensual",
        petition: "RunCierreMensual",
        shouldProcessRow: (row) => row.procesa,
    },
    "cierre-ejercicio": {
        title: "Cierre de ejercicio",
        petition: "RunCierreEjercicio",
        shouldProcessRow: () => true,
    },
};

function formatYYYYMMToMMYYYY(value: string | null): string {
    if (!value) return "";
    const str = String(value);
    if (!/^\d{6}$/.test(str)) return str;
    return `${str.slice(4, 6)}/${str.slice(0, 4)}`;
}

export default function ProcessRunner({ mode, simulationOnly = false }: { mode: ProcessMode; simulationOnly?: boolean }): React.ReactElement {
    const dispatch = useDispatch();
    const pathname = usePathname();
    const client = useSelector((state: RootState) => state.authorization.client);
    const clientMenu = useSelector((state: RootState) => state.nav.find((m: Menu) => m.client === client));
    const [rows, setRows] = useState<ProcessRow[]>([]);
    const [initialRows, setInitialRows] = useState<ProcessRow[]>([]);
    const [states, setStates] = useState<Record<string, Estado>>({});
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showCloseSuccessModal, setShowCloseSuccessModal] = useState(false);

    const cfg = useMemo(() => modeConfig[mode], [mode]);

    const getRowKey = useCallback((row: ProcessRow): string => `${row.idMoextra}-${row.nombretabla}`, []);

    const fetchRows = useCallback(async () => {
        if (!client) return;
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await fetch("/api/processes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetRows", client, data: { simulationOnly } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Error cargando parámetros del proceso");
            if (!Array.isArray(data)) throw new Error("Respuesta inválida del servidor");
            const list = (data as ProcessRow[]).filter((row) => {
                if (mode !== "generacion-asientos") return true;
                const clave = (row.clave ?? "").trim().toLowerCase();
                const idMoextra = (row.idMoextra ?? "").trim().toLowerCase();
                return clave !== "im" && idMoextra !== "im";
            });
            setRows(list);
            setInitialRows(list);
            const nextStates: Record<string, Estado> = {};
            for (const row of list) nextStates[getRowKey(row)] = "Pendiente";
            setStates(nextStates);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [client, getRowKey, mode, simulationOnly]);

    const closeCurrentProcessPage = useCallback(() => {
        if (!clientMenu) return;
        const menuId = clientMenu.menu.findIndex((menu) => menu.submenu.some((submenu) => submenu.path === pathname));
        const submenuId = menuId >= 0 ? clientMenu.menu[menuId].submenu.findIndex((submenu) => submenu.path === pathname) : -1;
        if (menuId < 0 || submenuId < 0) return;

        const currentSubmenu = clientMenu.menu[menuId].submenu[submenuId];
        const openTabs = clientMenu.menu
            .flatMap((menu) => menu.submenu)
            .filter((submenu) => submenu.isOpen && submenu.path !== currentSubmenu.path)
            .sort((a, b) => a.order - b.order);
        const fallback =
            openTabs.find((submenu) => submenu.order === currentSubmenu.order - 1) ??
            openTabs.find((submenu) => submenu.order === currentSubmenu.order + 1) ??
            openTabs[openTabs.length - 1];

        dispatch(navActions.closePage({ client, submenuId, menuId }));
        dispatch(openPagesActions.removeOpenPage({ page: currentSubmenu.table }));
        if (fallback) {
            dispatch(openPagesActions.setActivePage({ page: fallback.table }));
            window.history.replaceState(null, "", fallback.path);
        }
    }, [client, clientMenu, dispatch, pathname]);

    useEffect(() => {
        void fetchRows();
    }, [fetchRows]);

    const runProcess = useCallback(async () => {
        if (!client || running) return;
        setRunning(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        setShowErrorAlert(false);
        setShowSuccessAlert(false);
        setShowCloseSuccessModal(false);
        let processedCount = 0;

        for (const row of rows) {
            if (!cfg.shouldProcessRow(row)) continue;
            processedCount += 1;
            const key = getRowKey(row);
            setStates((prev) => ({ ...prev, [key]: "Ejecutando" }));
            try {
                const res = await fetch("/api/processes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: cfg.petition,
                        client,
                        data: { row },
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.message ?? "Error ejecutando proceso");
                setStates((prev) => ({ ...prev, [key]: "OK" }));
            } catch (err) {
                setStates((prev) => ({ ...prev, [key]: "Error" }));
                setErrorMessage(err instanceof Error ? err.message : String(err));
                setShowErrorAlert(true);
                setRunning(false);
                return;
            }
        }

        if (mode === "amortizacion" && processedCount > 0) {
            try {
                const res = await fetch("/api/processes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: "FinalizeCalculoAmortizacion",
                        client,
                        data: {},
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.message ?? "Error finalizando cálculo de amortizaciones");
            } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : String(err));
                setShowErrorAlert(true);
                setRunning(false);
                return;
            }
        }

        setRunning(false);
        if (processedCount > 0) {
            if (mode === "cierre-ejercicio") {
                setShowCloseSuccessModal(true);
                return;
            }
            setSuccessMessage(`${cfg.title} ejecutado correctamente`);
            setShowSuccessAlert(true);
        }
    }, [cfg, client, closeCurrentProcessPage, getRowKey, mode, rows, running]);

    const handleAcceptCloseSuccess = useCallback(() => {
        setShowCloseSuccessModal(false);
        closeCurrentProcessPage();
    }, [closeCurrentProcessPage]);

    const renderHeaders = mode === "cierre-ejercicio"
        ? ["Tabla", "Fecha cierre", "Estado"]
        : mode === "cierre-mensual"
        ? ["Tabla", "Fecha inicio", "Fecha proceso", "Fecha anterior", "Estado"]
        : ["Tabla", "Fecha inicio", "Fecha proceso", "Fecha anterior", "Procesa", "Usa otro", "Estado"];

    const handleRevert = useCallback(async () => {
        if (running) return;
        if (initialRows.length === 0) {
            await fetchRows();
            return;
        }
        setRows(initialRows);
        const nextStates: Record<string, Estado> = {};
        for (const row of initialRows) nextStates[getRowKey(row)] = "Pendiente";
        setStates(nextStates);
        setShowErrorAlert(false);
        setErrorMessage(null);
        setShowSuccessAlert(false);
        setSuccessMessage(null);
    }, [running, initialRows, fetchRows, getRowKey]);

    return (
        <div className="flex flex-col w-full h-full">
            <Modal
                isOpen={showCloseSuccessModal}
                style="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 p-0 bg-transparent border-none outline-none backdrop:bg-gabu-900/40"
            >
                <div className="w-[420px] max-w-[92vw] bg-gabu-100 border border-gabu-900 rounded-md p-5 flex flex-col gap-4">
                    <p className="text-gabu-900 text-lg font-medium">Cierre de ejercicio ejecutado con exito</p>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="px-6 py-2 bg-gabu-900 text-gabu-100 rounded-md hover:bg-gabu-700 transition-colors duration-150"
                            onClick={handleAcceptCloseSuccess}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            </Modal>
            <Alert
                message={errorMessage}
                type="error"
                show={showErrorAlert && !!errorMessage}
                onClose={() => {
                    setShowErrorAlert(false);
                    setErrorMessage(null);
                }}
            />
            <Alert
                message={successMessage}
                type="success"
                show={showSuccessAlert && !!successMessage}
                onClose={() => {
                    setShowSuccessAlert(false);
                    setSuccessMessage(null);
                }}
            />
            <div className="m-1.5 sm:m-2.5 lg:m-3.5 rounded-md border border-gabu-900 bg-gabu-500 p-1.5 pt-1 sm:p-2.5 sm:pt-1.5 lg:p-4 lg:pt-1.5 flex flex-1 flex-col overflow-hidden">
                <div className="mb-0.5 sm:mb-1 lg:mb-1.5 flex w-full items-center justify-between">
                    <p className="text-gabu-100 text-xs sm:text-sm lg:text-base">{cfg.title}</p>
                </div>

                <div className="bg-gabu-100 flex-1 min-h-0 border border-gabu-900 p-1 sm:p-1.5 lg:p-2.5 overflow-auto">
                    {loading ? (
                        <div className="min-w-full">
                            <Skeleton count={10} height={20} highlightColor="var(--color-gabu-700)" baseColor="var(--color-gabu-300)" className="mb-1" />
                        </div>
                    ) : (
                        <table className="border-collapse divide-y-2 divide-gabu-900/25 w-full">
                            <thead>
                                <tr>
                                    {renderHeaders.map((h) => (
                                        <th key={h} className="text-start py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                                            <p className="text-[11px] sm:text-xs">{h}</p>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-gabu-900/25">
                                {rows.map((row) => {
                                    const key = getRowKey(row);
                                    const state = states[key] ?? "Pendiente";
                                    if (mode === "cierre-ejercicio") {
                                        return (
                                            <tr key={key}>
                                                <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{row.nombretabla}</td>
                                                <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatYYYYMMToMMYYYY(row.fecant)}</td>
                                                <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{state}</td>
                                            </tr>
                                        );
                                    }
                                    if (mode === "cierre-mensual") {
                                        return (
                                            <tr key={key}>
                                                <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{row.nombretabla}</td>
                                                <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatYYYYMMToMMYYYY(row.fecini)}</td>
                                                <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatYYYYMMToMMYYYY(row.fecpro)}</td>
                                                <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatYYYYMMToMMYYYY(row.fecant)}</td>
                                                <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{state}</td>
                                            </tr>
                                        );
                                    }
                                    return (
                                        <tr key={key}>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{row.nombretabla}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatYYYYMMToMMYYYY(row.fecini)}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatYYYYMMToMMYYYY(row.fecpro)}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatYYYYMMToMMYYYY(row.fecant)}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{row.procesa ? "SI" : "NO"}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{row.alterna ? "SI" : "NO"}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{state}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <div className="sticky w-full bg-gabu-500 flex justify-end gap-1.5 sm:gap-2.5 lg:gap-4 px-1.5 py-1 sm:px-2.5 sm:py-1.5">
                {mode !== "cierre-ejercicio" && (
                    <button
                        type="button"
                        className="font-normal text-gabu-900 min-w-[5rem] sm:min-w-[6rem] lg:min-w-[7rem] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-[11px] sm:text-xs px-2.5 py-0.5 sm:px-3.5 sm:py-1"
                        onClick={() => void handleRevert()}
                        disabled={running || loading}
                    >
                        Revertir
                    </button>
                )}
                <button
                    type="button"
                    className="font-normal text-gabu-900 min-w-[5rem] sm:min-w-[6rem] lg:min-w-[7rem] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-[11px] sm:text-xs px-2.5 py-0.5 sm:px-3.5 sm:py-1"
                    onClick={() => void runProcess()}
                    disabled={running || loading}
                >
                    {running ? "Ejecutando..." : "Ejecutar"}
                </button>
            </div>
        </div>
    );
}
