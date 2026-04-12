'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { parseStringDate, parseDateString } from "@/util/date/parseDate";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

type ParametroRow = {
    idmoextra: string;
    fecini: Date | null;
    fecpro: Date | null;
    fecant: Date | null;
    procesa: boolean;
    IdTipoAmortizacion: string | null;
    alterna: boolean;
};

function dateToMMYYYY(d: Date | null): string {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return "";
    return parseStringDate(date);
}

function parseToISOOrNull(val: string | null): string | null {
    if (!val || !val.trim()) return null;
    const s = val.trim();
    if (/^\d{1,2}\/\d{4}$/.test(s)) return parseDateString(s).toISOString();
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

const DATE_FORMAT_MSG = "El formato de la fecha es inválido. Utilice MM/YYYY.";

function getDateValidationError(value: string): string | null {
    const s = value.trim();
    if (s === "") return null;
    if (!/^\d{1,2}\/\d{4}$/.test(s)) return DATE_FORMAT_MSG;
    const [monthStr] = s.split("/");
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12) return DATE_FORMAT_MSG;
    return null;
}

const PARAMETROS_COLUMNS = ["idmoextra", "fecini", "fecpro", "fecant", "procesa", "IdTipoAmortizacion", "alterna"] as const;

const MOEXTRA_LABELS_HARDCODED: Record<string, string> = {
    im: "Impuestos",
    ml: "Moneda local",
};

export default function ManageParameters({ simulationOnly = false }: { simulationOnly?: boolean }): React.ReactElement {
    const client = useSelector((state: RootState) => state.authorization.client);
    const [rows, setRows] = useState<ParametroRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingAll, setSavingAll] = useState(false);
    const [revertKey, setRevertKey] = useState(0);
    const [tipAmorOptions, setTipAmorOptions] = useState<{ key: string; value: string }[]>([]);
    const [moextraById, setMoextraById] = useState<Record<string, string>>({});
    const [headerLabels, setHeaderLabels] = useState<Record<string, string>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<number, { fecini?: string; fecpro?: string; fecant?: string }>>({});
    const rowInputRefs = useRef<Record<number, { fecini: HTMLInputElement | null; fecpro: HTMLInputElement | null; fecant: HTMLInputElement | null }>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/fixedAssets/parameters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "Get", client, data: { simulationOnly } }),
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setRows(
                    data.map((r: ParametroRow & { fecini?: string; fecpro?: string; fecant?: string }) => ({
                        idmoextra: r.idmoextra,
                        fecini: r.fecini ? new Date(r.fecini) : null,
                        fecpro: r.fecpro ? new Date(r.fecpro) : null,
                        fecant: r.fecant ? new Date(r.fecant) : null,
                        procesa: Boolean(r.procesa),
                        IdTipoAmortizacion: r.IdTipoAmortizacion ?? null,
                        alterna: Boolean(r.alterna),
                    }))
                );
            }
        } finally {
            setLoading(false);
        }
    }, [client, simulationOnly]);

    const fetchTipAmorOptions = useCallback(async () => {
        if (!client) return;
        const res = await fetch("/api/fixedAssets/parameters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ petition: "GetTipAmor", client, data: {} }),
        });
        const data = await res.json();
        if (Array.isArray(data)) setTipAmorOptions(data);
    }, [client]);

    const fetchParametrosFields = useCallback(async () => {
        if (!client) return;
        const res = await fetch("/api/fixedAssets/parameters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ petition: "GetParametrosFields", client, data: {} }),
        });
        const data = await res.json();
        if (Array.isArray(data)) {
            const labels: Record<string, string> = {};
            for (const f of data as { IdCampo: string; BrowNombre: string | null }[]) {
                const key = f.IdCampo.toLowerCase();
                labels[key] = f.BrowNombre ?? f.IdCampo;
            }
            setHeaderLabels(labels);
        }
    }, [client]);

    const fetchMoextra = useCallback(async () => {
        if (!client) return;
        const res = await fetch("/api/fixedAssets/parameters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ petition: "GetMoextra", client, data: { simulationOnly } }),
        });
        const data = await res.json();
        if (Array.isArray(data)) {
            const map: Record<string, string> = {};
            for (const row of data as { idMoextra: string; Descripcion: string | null }[]) {
                const id = row.idMoextra ?? "";
                const desc = row.Descripcion?.trim() || id;
                map[id] = desc;
            }
            setMoextraById(map);
        }
    }, [client, simulationOnly]);

    useEffect(() => {
        if (client) fetchData();
    }, [client, fetchData]);

    useEffect(() => {
        if (client) fetchTipAmorOptions();
    }, [client, fetchTipAmorOptions]);

    useEffect(() => {
        if (client) fetchParametrosFields();
    }, [client, fetchParametrosFields]);

    useEffect(() => {
        if (client) fetchMoextra();
    }, [client, fetchMoextra]);

    const setRowRef = useCallback(
        (rowIndex: number, field: "fecini" | "fecpro" | "fecant") =>
            (el: HTMLInputElement | null) => {
                if (!rowInputRefs.current[rowIndex]) rowInputRefs.current[rowIndex] = { fecini: null, fecpro: null, fecant: null };
                rowInputRefs.current[rowIndex][field] = el;
            },
        []
    );

    const clearFieldError = useCallback((rowIndex: number, field: "fecini" | "fecpro" | "fecant") => {
        setFieldErrors((prev) => {
            const next = { ...prev };
            if (next[rowIndex]) {
                const nextRow = { ...next[rowIndex] };
                delete nextRow[field];
                if (Object.keys(nextRow).length === 0) delete next[rowIndex];
                else next[rowIndex] = nextRow;
            }
            return next;
        });
    }, []);

    const handleIdTipoAmortizacionChange = useCallback((rowIndex: number) => (e: React.MouseEvent<HTMLLIElement>, _ref: React.RefObject<HTMLSpanElement | null>) => {
        const key = (e.currentTarget as HTMLElement).dataset.key ?? "";
        setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, IdTipoAmortizacion: key || null } : r)));
    }, []);

    const handleBooleanChange = useCallback((rowIndex: number, field: "procesa" | "alterna") => (e: React.MouseEvent<HTMLLIElement>, _ref: React.RefObject<HTMLSpanElement | null>) => {
        const key = (e.currentTarget as HTMLElement).dataset.key ?? "";
        const value = key === "true";
        setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [field]: value } : r)));
    }, []);

    const validateAllDates = useCallback((): boolean => {
        const errors: Record<number, { fecini?: string; fecpro?: string; fecant?: string }> = {};
        for (let i = 0; i < rows.length; i++) {
            const refs = rowInputRefs.current[i];
            const feciniErr = getDateValidationError(refs?.fecini?.value ?? "");
            const fecproErr = getDateValidationError(refs?.fecpro?.value ?? "");
            const fecantErr = getDateValidationError(refs?.fecant?.value ?? "");
            if (feciniErr || fecproErr || fecantErr) {
                errors[i] = {};
                if (feciniErr) errors[i].fecini = feciniErr;
                if (fecproErr) errors[i].fecpro = fecproErr;
                if (fecantErr) errors[i].fecant = fecantErr;
            }
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }, [rows.length]);

    const handleSaveAll = useCallback(async () => {
        if (!validateAllDates()) return;
        setFieldErrors({});
        setSavingAll(true);
        try {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const refs = rowInputRefs.current[i];
                const feciniStr = refs?.fecini?.value?.trim() || null;
                const fecproStr = refs?.fecpro?.value?.trim() || null;
                const fecantStr = refs?.fecant?.value?.trim() || null;
                const IdTipoAmortizacion = row.IdTipoAmortizacion?.trim() || null;
                const res = await fetch("/api/fixedAssets/parameters", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: "Update",
                        client,
                        data: {
                            simulationOnly,
                            idmoextra: row.idmoextra,
                            fecini: parseToISOOrNull(feciniStr),
                            fecpro: parseToISOOrNull(fecproStr),
                            fecant: parseToISOOrNull(fecantStr),
                            procesa: row.procesa,
                            IdTipoAmortizacion: IdTipoAmortizacion || null,
                            alterna: row.alterna,
                        },
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    alert(err?.message ?? "Error al guardar");
                    return;
                }
            }
            await fetchData();
        } finally {
            setSavingAll(false);
        }
    }, [client, rows, fetchData, validateAllDates, simulationOnly]);

    const handleRevert = useCallback(() => {
        setFieldErrors({});
        fetchData();
        setRevertKey((k) => k + 1);
    }, [fetchData]);

    const BOOLEAN_OPTIONS = [
        { key: "false", value: "No" },
        { key: "true", value: "Sí" },
    ];

    if (loading) {
        return (
            <div className="flex flex-col w-full h-full">
                <div className="p-5 pt-2 m-4 bg-gabu-500 flex flex-1 flex-col rounded-md border border-gabu-900 overflow-hidden">
                    <div className="flex w-full justify-center mb-2">
                        <p className="text-gabu-100">Manejo de parámetros</p>
                    </div>
                    <div className="bg-gabu-100 flex-1 min-h-0 border border-gabu-900 p-3 overflow-auto">
                        <div className="min-w-full">
                            <Skeleton count={10} height={20} highlightColor="var(--color-gabu-700)" baseColor="var(--color-gabu-300)" className="mb-1" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const buttonStyle = "font-normal text-gabu-900 w-[15%] bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300";

    return (
        <div className="flex flex-col w-full h-full">
            <div className="p-5 pt-2 m-4 bg-gabu-500 flex flex-1 flex-col rounded-md border border-gabu-900 overflow-hidden">
                <div className="flex w-full justify-center mb-2">
                    <p className="text-gabu-100">Manejo de parámetros</p>
                </div>
                <div className="bg-gabu-100 flex-1 min-h-0 border border-gabu-900 p-3 overflow-auto">
                    <table className="border-collapse divide-y-2 divide-gabu-900/25 w-full">
                        <thead>
                            <tr>
                                {PARAMETROS_COLUMNS.map((columnId) => (
                                    <th key={columnId} className="text-start py-2 px-2 text-gabu-900 whitespace-nowrap overflow-x-hidden">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm">{headerLabels[columnId.toLowerCase()] ?? columnId}</p>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-gabu-900/25 relative">
                            {rows.map((row, i) => (
                                <tr key={`${row.idmoextra}-${revertKey}`}>
                                    <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">
                                        <span>{MOEXTRA_LABELS_HARDCODED[row.idmoextra?.toLowerCase()] ?? moextraById[row.idmoextra] ?? row.idmoextra}</span>
                                    </td>
                                    <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">
                                        <Input
                                            label=""
                                            hasLabel={false}
                                            isLogin={false}
                                            disabled={false}
                                            type="text"
                                            ref={setRowRef(i, "fecini") as React.Ref<HTMLInputElement>}
                                            isError={!!fieldErrors[i]?.fecini}
                                            errorMessage={fieldErrors[i]?.fecini ?? null}
                                            defaultValue={dateToMMYYYY(row.fecini)}
                                            handleInput={() => clearFieldError(i, "fecini")}
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">
                                        <Input
                                            label=""
                                            hasLabel={false}
                                            isLogin={false}
                                            disabled={false}
                                            type="text"
                                            ref={setRowRef(i, "fecpro") as React.Ref<HTMLInputElement>}
                                            isError={!!fieldErrors[i]?.fecpro}
                                            errorMessage={fieldErrors[i]?.fecpro ?? null}
                                            defaultValue={dateToMMYYYY(row.fecpro)}
                                            handleInput={() => clearFieldError(i, "fecpro")}
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">
                                        <Input
                                            label=""
                                            hasLabel={false}
                                            isLogin={false}
                                            disabled={false}
                                            type="text"
                                            ref={setRowRef(i, "fecant") as React.Ref<HTMLInputElement>}
                                            isError={!!fieldErrors[i]?.fecant}
                                            errorMessage={fieldErrors[i]?.fecant ?? null}
                                            defaultValue={dateToMMYYYY(row.fecant)}
                                            handleInput={() => clearFieldError(i, "fecant")}
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">
                                        <Select
                                            label=""
                                            hasLabel={false}
                                            isLogin={false}
                                            options={BOOLEAN_OPTIONS}
                                            defaultValue={row.procesa ? "true" : "false"}
                                            chooseOptionHandler={handleBooleanChange(i, "procesa")}
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">
                                        <Select
                                            label=""
                                            hasLabel={false}
                                            isLogin={false}
                                            options={tipAmorOptions}
                                            defaultValue={row.IdTipoAmortizacion ?? ""}
                                            chooseOptionHandler={handleIdTipoAmortizacionChange(i)}
                                        />
                                    </td>
                                    <td className="py-2 px-2 text-gabu-900 text-xs whitespace-nowrap ">
                                        <Select
                                            label=""
                                            hasLabel={false}
                                            isLogin={false}
                                            options={BOOLEAN_OPTIONS}
                                            defaultValue={row.alterna ? "true" : "false"}
                                            chooseOptionHandler={handleBooleanChange(i, "alterna")}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="sticky w-full h-15 bg-gabu-500 flex justify-end gap-5 p-3">
                <Button
                    text="Revertir"
                    type="button"
                    disabled={savingAll}
                    handleClick={handleRevert}
                    style={buttonStyle}
                />
                <Button
                    text={savingAll ? "Guardando…" : "Guardar"}
                    type="button"
                    disabled={savingAll}
                    handleClick={handleSaveAll}
                    style={buttonStyle}
                />
            </div>
        </div>
    );
}
