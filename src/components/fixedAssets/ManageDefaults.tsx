"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

type DefaultRow = { idcampo: string; iddefault: string | null };

/** Misma base visual que `ManageParameters` (shell, tabla densa, footer). */
const shellOuter = "p-2 pt-1.5 m-1.5 sm:m-2";
const innerPad = "p-1.5 sm:p-2";
const titleClass = "text-gabu-100 text-sm font-medium tracking-tight";
const tableClass = "w-full min-w-0 border-collapse table-auto";
const thClass =
    "text-start py-1 px-1.5 text-gabu-900 whitespace-nowrap overflow-x-hidden overflow-ellipsis leading-snug border-b border-gabu-900/30";
const thLabel = "text-xs font-semibold tracking-tight";
const tdClass =
    "py-1 px-1.5 text-gabu-900 text-xs whitespace-nowrap leading-snug align-middle overflow-hidden";
const colCampo = "min-w-[11rem]";
const colDefault = "min-w-[18rem]";
const controlWrap = "min-w-0 w-full max-w-full";
const footerBar = "sticky w-full bg-gabu-500 flex justify-end gap-1.5 p-1.5 border-t border-gabu-900/40";
const buttonStyle =
    "font-normal text-gabu-900 bg-gabu-100 rounded-md hover:bg-gabu-300 cursor-pointer transition-colors duration-300 text-xs px-3 py-1 min-w-[5rem] w-auto sm:max-w-[40%]";

export default function ManageDefaults(): React.ReactElement {
    const client = useSelector((state: RootState) => state.authorization.client);
    const [rows, setRows] = useState<DefaultRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingAll, setSavingAll] = useState(false);
    const [revertKey, setRevertKey] = useState(0);
    const [optionsByCampo, setOptionsByCampo] = useState<Record<string, { key: string; value: string }[]>>({});
    const [headerLabels, setHeaderLabels] = useState<Record<string, string>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/fixedAssets/defaults", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "Get", client, data: {} }),
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setRows(
                    data.map((r: DefaultRow) => ({
                        idcampo: r.idcampo,
                        iddefault: r.iddefault ?? null,
                    }))
                );
            }
        } finally {
            setLoading(false);
        }
    }, [client]);

    const fetchOptionsForCampo = useCallback(
        async (idcampo: string) => {
            if (!client || !idcampo) return;
            const res = await fetch("/api/fixedAssets/defaults", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petition: "GetOptions", client, data: { idcampo } }),
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setOptionsByCampo((prev) => ({ ...prev, [idcampo]: data }));
            }
        },
        [client]
    );

    const fetchDefaultsFields = useCallback(async () => {
        if (!client) return;
        const res = await fetch("/api/fixedAssets/defaults", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ petition: "GetDefaultsFields", client, data: {} }),
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

    useEffect(() => {
        if (client) fetchData();
    }, [client, fetchData]);

    useEffect(() => {
        if (client) fetchDefaultsFields();
    }, [client, fetchDefaultsFields]);

    useEffect(() => {
        if (!client || rows.length === 0) return;
        const distinct = [...new Set(rows.map((r) => r.idcampo))];
        distinct.forEach((idcampo) => {
            if (!optionsByCampo[idcampo]) {
                fetchOptionsForCampo(idcampo);
            }
        });
    }, [client, rows, optionsByCampo, fetchOptionsForCampo]);

    const handleIddefaultChange = useCallback((rowIndex: number) => {
        return (e: React.MouseEvent<HTMLLIElement>, _ref: React.RefObject<HTMLSpanElement | null>) => {
            const key = (e.currentTarget as HTMLElement).dataset.key ?? "";
            setRows((prev) =>
                prev.map((r, i) => (i === rowIndex ? { ...r, iddefault: key || null } : r))
            );
        };
    }, []);

    const handleSaveAll = useCallback(async () => {
        setSavingAll(true);
        try {
            for (const row of rows) {
                const res = await fetch("/api/fixedAssets/defaults", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: "Update",
                        client,
                        data: { idcampo: row.idcampo, iddefault: row.iddefault },
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
    }, [client, rows, fetchData]);

    const handleRevert = useCallback(() => {
        fetchData();
        setRevertKey((k) => k + 1);
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex flex-col w-full h-full">
                <div className={`${shellOuter} bg-gabu-500 flex flex-1 flex-col rounded-md border border-gabu-900 overflow-hidden`}>
                    <div className="flex w-full justify-center mb-1">
                        <p className={titleClass}>Valores por defecto</p>
                    </div>
                    <div className={`bg-gabu-100 flex-1 min-h-0 border border-gabu-900 ${innerPad} overflow-auto`}>
                        <div className="min-w-0 w-full">
                            <Skeleton
                                count={10}
                                height={12}
                                highlightColor="var(--color-gabu-700)"
                                baseColor="var(--color-gabu-300)"
                                className="mb-0.5"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full">
            <div className={`${shellOuter} bg-gabu-500 flex flex-1 flex-col rounded-md border border-gabu-900 overflow-hidden`}>
                <div className="flex w-full justify-center mb-1">
                    <p className={titleClass}>Valores por defecto</p>
                </div>
                <div className={`bg-gabu-100 flex-1 min-h-0 min-w-0 border border-gabu-900 ${innerPad} overflow-auto`}>
                    <table className={tableClass}>
                        <thead>
                            <tr>
                                <th className={`${thClass} ${colCampo}`}>
                                    <div className="flex min-w-0 items-center gap-0.5">
                                        <p className={`${thLabel} truncate`}>{headerLabels["idcampo"] ?? "Campo"}</p>
                                    </div>
                                </th>
                                <th className={`${thClass} ${colDefault}`}>
                                    <div className="flex min-w-0 items-center gap-0.5">
                                        <p className={`${thLabel} truncate`}>{headerLabels["iddefault"] ?? "Cod. default"}</p>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gabu-900/15 relative">
                            {rows.map((row, i) => {
                                const labelText = headerLabels[row.idcampo.toLowerCase()] ?? row.idcampo;
                                return (
                                    <tr key={`${row.idcampo}-${revertKey}`}>
                                        <td className={`${tdClass} ${colCampo}`}>
                                            <span className="block truncate" title={labelText}>
                                                {labelText}
                                            </span>
                                        </td>
                                        <td className={`${tdClass} ${colDefault}`}>
                                            <div className={controlWrap}>
                                                <Select
                                                    label=""
                                                    hasLabel={false}
                                                    isLogin={false}
                                                    variant="tableCell"
                                                    options={(() => {
                                                        const opts = optionsByCampo[row.idcampo] ?? [];
                                                        const current = row.iddefault?.trim();
                                                        if (current && !opts.some((o) => o.key === current)) {
                                                            return [...opts, { key: current, value: current }];
                                                        }
                                                        return opts;
                                                    })()}
                                                    defaultValue={row.iddefault ?? ""}
                                                    chooseOptionHandler={handleIddefaultChange(i)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className={footerBar}>
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
