'use client';

import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { RootState } from "@/store";
import { formatApiErrorFromBody } from "@/lib/logger/apiError";
import { formatNumberEs } from "@/util/number/formatNumberEs";

type InterfaceBookRow = {
    idMoextra: string;
    label: string;
    asientosTable: "asientosml" | "asientos01" | "asientos02";
    fecpro: string;
    asientos: number;
    lineas: number;
    debe: number;
    haber: number;
    diferencia: number;
    alreadySent: boolean;
};

type Estado = "Pendiente" | "Enviando" | "OK" | "Error";

function formatYYYYMMToMMYYYY(value: string | null): string {
    if (!value) return "";
    const str = String(value);
    if (!/^\d{6}$/.test(str)) return str;
    return `${str.slice(4, 6)}/${str.slice(0, 4)}`;
}

export default function InterfaceAsientos(): React.ReactElement {
    const client = useSelector((state: RootState) => state.authorization.client);
    const [rows, setRows] = useState<InterfaceBookRow[]>([]);
    const [states, setStates] = useState<Record<string, Estado>>({});
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const fetchRows = useCallback(async () => {
        if (!client) return;
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await fetch("/api/processes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetInterfaceRows", client }),
            });
            const data = await res.json() as { message?: string; requestId?: string } | InterfaceBookRow[];
            if (!res.ok) {
                throw new Error(formatApiErrorFromBody(
                    Array.isArray(data) ? null : data,
                    "Error cargando asientos a interfacear",
                ));
            }
            if (!Array.isArray(data)) throw new Error("Respuesta invalida del servidor");
            setRows(data);
            const nextStates: Record<string, Estado> = {};
            for (const row of data) {
                nextStates[row.idMoextra] = "Pendiente";
            }
            setStates(nextStates);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : String(err));
            setShowErrorAlert(true);
        } finally {
            setLoading(false);
        }
    }, [client]);

    useEffect(() => {
        void fetchRows();
    }, [fetchRows]);

    const pendingBooks = rows.filter((row) => row.lineas > 0 && !row.alreadySent);
    const pendingIds = pendingBooks.map((row) => row.idMoextra);
    const pendingLabels = pendingBooks.map((row) => row.label);

    const sendPending = useCallback(async () => {
        if (!client || running || pendingIds.length === 0) return;
        setShowConfirm(false);
        setRunning(true);
        setShowErrorAlert(false);
        setShowSuccessAlert(false);
        setErrorMessage(null);
        setSuccessMessage(null);
        setStates((prev) => {
            const next = { ...prev };
            for (const id of pendingIds) next[id] = "Enviando";
            return next;
        });
        try {
            const res = await fetch("/api/processes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "RunInterfaceAsientos",
                    client,
                    data: { idMoextras: pendingIds },
                }),
            });
            const data = await res.json() as { message?: string; sent?: string[] };
            if (!res.ok) throw new Error(formatApiErrorFromBody(data, "Error al enviar a contable"));
            setStates((prev) => {
                const next = { ...prev };
                for (const id of pendingIds) next[id] = "OK";
                return next;
            });
            setSuccessMessage("Asientos enviados a contable");
            setShowSuccessAlert(true);
            await fetchRows();
        } catch (err) {
            setStates((prev) => {
                const next = { ...prev };
                for (const id of pendingIds) next[id] = "Error";
                return next;
            });
            setErrorMessage(err instanceof Error ? err.message : String(err));
            setShowErrorAlert(true);
        } finally {
            setRunning(false);
        }
    }, [client, fetchRows, pendingIds, running]);

    return (
        <div className="flex flex-col w-full h-full">
            <Modal
                isOpen={showConfirm}
                style="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 p-0 bg-transparent border-none outline-none backdrop:bg-gabu-900/40"
            >
                <div className="w-[420px] max-w-[92vw] bg-gabu-100 border border-gabu-900 rounded-md p-5 flex flex-col gap-4">
                    <p className="text-gabu-900 text-lg font-medium">Enviar a contable</p>
                    <p className="text-gabu-900 text-sm">
                        Se van a enviar al contable los asientos de: {pendingLabels.join(", ")}.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="px-6 py-2 bg-gabu-300 text-gabu-900 rounded-md hover:bg-gabu-500 transition-colors duration-150"
                            onClick={() => setShowConfirm(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="px-6 py-2 bg-gabu-900 text-gabu-100 rounded-md hover:bg-gabu-700 transition-colors duration-150"
                            onClick={() => void sendPending()}
                        >
                            Enviar
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
                    <p className="text-gabu-100 text-xs sm:text-sm lg:text-base">Interface de asientos</p>
                </div>
                <div className="bg-gabu-100 flex-1 min-h-0 border border-gabu-900 p-1 sm:p-1.5 lg:p-2.5 overflow-auto">
                    {loading ? (
                        <div className="min-w-full">
                            <Skeleton count={6} height={20} highlightColor="var(--color-gabu-700)" baseColor="var(--color-gabu-300)" className="mb-1" />
                        </div>
                    ) : (
                        <table className="border-collapse divide-y-2 divide-gabu-900/25 w-full">
                            <thead>
                                <tr>
                                    {["Libro", "Fecha proceso", "Asientos", "Lineas", "Debe", "Haber", "Diferencia", "Estado"].map((h) => (
                                        <th key={h} className="text-start py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 whitespace-nowrap">
                                            <p className="text-[11px] sm:text-xs">{h}</p>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-gabu-900/25">
                                {rows.map((row) => {
                                    const diferencia = row.diferencia;
                                    return (
                                        <tr key={row.idMoextra}>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{row.label}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatYYYYMMToMMYYYY(row.fecpro)}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatNumberEs(row.asientos, 0, 0)}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatNumberEs(row.lineas, 0, 0)}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatNumberEs(row.debe, 2, 2)}</td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">{formatNumberEs(row.haber, 2, 2)}</td>
                                            <td className={`py-1 px-1.5 sm:py-1.5 sm:px-2 text-[10px] sm:text-[11px] whitespace-nowrap ${Math.abs(diferencia) >= 0.01 ? "text-red-700" : "text-gabu-900"}`}>
                                                {formatNumberEs(diferencia, 2, 2)}
                                            </td>
                                            <td className="py-1 px-1.5 sm:py-1.5 sm:px-2 text-gabu-900 text-[10px] sm:text-[11px] whitespace-nowrap">
                                                {states[row.idMoextra] && states[row.idMoextra] !== "Pendiente"
                                                    ? states[row.idMoextra]
                                                    : row.alreadySent
                                                        ? "Ya enviado"
                                                        : "Pendiente"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <div className="sticky w-full bg-gabu-500 flex justify-end gap-1.5 sm:gap-2.5 lg:gap-4 px-1.5 py-1 sm:px-2.5 sm:py-1.5">
                <button
                    type="button"
                    className="font-normal text-gabu-900 min-w-[7rem] sm:min-w-[8rem] lg:min-w-[9rem] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-[11px] sm:text-xs px-2.5 py-0.5 sm:px-3.5 sm:py-1"
                    onClick={() => setShowConfirm(true)}
                    disabled={running || loading || pendingIds.length === 0}
                >
                    {running ? "Enviando..." : "Enviar a contable"}
                </button>
            </div>
        </div>
    );
}
