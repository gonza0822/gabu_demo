'use client';

import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Cross from "@/components/svg/Cross";
import Button from "@/components/ui/Button";

export type ChargesFilterValues = {
    period: string;
    cdobra: string;
};

function toYyyymm(value: unknown): string {
    if (value == null) return "";
    if (value instanceof Date) {
        const year = value.getUTCFullYear();
        const month = String(value.getUTCMonth() + 1).padStart(2, "0");
        return `${year}${month}`;
    }
    const text = String(value).trim();
    if (!text) return "";
    if (/^\d{6}$/.test(text)) return text;
    if (/^\d{4}-\d{2}/.test(text)) return `${text.slice(0, 4)}${text.slice(5, 7)}`;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}${month}`;
}

export default function ChargesFilterModal({
    isOpen,
    onClose,
    client,
    initialFilters,
    onSearch,
}: {
    isOpen: boolean;
    onClose: () => void;
    client: string;
    initialFilters: ChargesFilterValues;
    onSearch: (filters: ChargesFilterValues) => void;
}): React.ReactElement {
    const [period, setPeriod] = useState(initialFilters.period);
    const [cdobra, setCdobra] = useState(initialFilters.cdobra);
    const [periodError, setPeriodError] = useState<string | null>(null);
    const [cdobraError, setCdobraError] = useState<string | null>(null);
    const [defaultPeriod, setDefaultPeriod] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        setPeriod(initialFilters.period);
        setCdobra(initialFilters.cdobra);
        setPeriodError(null);
        setCdobraError(null);
    }, [isOpen, initialFilters.period, initialFilters.cdobra]);

    useEffect(() => {
        if (!isOpen || !client) return;
        let ignore = false;
        (async () => {
            try {
                const response = await fetch("/api/fixedAssets/parameters", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: "Get",
                        client,
                        data: {},
                    }),
                });
                if (!response.ok) return;
                const list = (await response.json()) as Array<{ idmoextra?: string; fecpro?: string | Date | null }>;
                const mlParams = list.find((item) => String(item.idmoextra ?? "").toLowerCase() === "ml");
                const yyyymm = toYyyymm(mlParams?.fecpro ?? null);
                if (!ignore) {
                    setDefaultPeriod(yyyymm);
                    if (!initialFilters.period) setPeriod(yyyymm);
                }
            } catch {
                if (!ignore) setDefaultPeriod("");
            }
        })();
        return () => {
            ignore = true;
        };
    }, [isOpen, client, initialFilters.period]);

    const periodPlaceholder = useMemo(() => {
        if (defaultPeriod) return `Ej: ${defaultPeriod}`;
        return "Ej: 202605";
    }, [defaultPeriod]);

    const validate = (): boolean => {
        const periodValue = period.trim();
        const cdobraValue = cdobra.trim();
        let nextPeriodError: string | null = null;
        let nextCdobraError: string | null = null;

        if (periodValue && !/^\d{6}$/.test(periodValue)) {
            nextPeriodError = "El período debe tener formato yyyymm.";
        } else if (periodValue) {
            const month = Number(periodValue.slice(4, 6));
            if (month < 1 || month > 12) nextPeriodError = "El período debe tener un mes válido (01-12).";
        }

        if (cdobraValue && !/^\d+$/.test(cdobraValue)) {
            nextCdobraError = "El proyecto (cdobra) debe ser numérico.";
        }

        setPeriodError(nextPeriodError);
        setCdobraError(nextCdobraError);
        return !nextPeriodError && !nextCdobraError;
    };

    const handleSearch = () => {
        if (!validate()) return;
        onSearch({ period: period.trim(), cdobra: cdobra.trim() });
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            style="fixed left-1/2 top-1/2 w-[min(32rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gabu-900 bg-gabu-700 p-5 shadow-xl sm:p-6"
        >
            <div className="mb-4 flex items-center justify-between border-b border-gabu-500 pb-3">
                <h3 className="text-base font-semibold text-gabu-100 sm:text-lg">Filtrar cargos</h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded p-1 transition-colors hover:bg-gabu-500"
                    aria-label="Cerrar"
                >
                    <Cross style="h-5 w-5 fill-current text-gabu-100" onClick={onClose} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <Input
                    label="Período (yyyymm)"
                    hasLabel
                    isLogin={false}
                    disabled={false}
                    type="text"
                    variant="columnFilter"
                    isError={Boolean(periodError)}
                    errorMessage={periodError}
                    value={period}
                    handleInput={(event) => {
                        setPeriod(event.currentTarget.value);
                        if (periodError) setPeriodError(null);
                    }}
                    placeholder={periodPlaceholder}
                    inputClassName="bg-gabu-500 text-gabu-100 placeholder:text-gabu-300 border-gabu-300"
                />
                <Input
                    label="Proyecto (cdobra)"
                    hasLabel
                    isLogin={false}
                    disabled={false}
                    type="text"
                    variant="columnFilter"
                    isError={Boolean(cdobraError)}
                    errorMessage={cdobraError}
                    value={cdobra}
                    handleInput={(event) => {
                        setCdobra(event.currentTarget.value);
                        if (cdobraError) setCdobraError(null);
                    }}
                    placeholder="Ej: 1205"
                    inputClassName="bg-gabu-500 text-gabu-100 placeholder:text-gabu-300 border-gabu-300"
                />
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-gabu-500 pt-4">
                <Button
                    text="Cerrar"
                    type="button"
                    handleClick={onClose}
                    style="rounded-md border border-gabu-900/30 bg-gabu-300 px-4 py-1.5 font-normal text-gabu-900 transition-colors duration-300 hover:bg-gabu-100"
                />
                <Button
                    text="Buscar"
                    type="button"
                    handleClick={handleSearch}
                    style="rounded-md border border-gabu-900/30 bg-gabu-900 px-4 py-1.5 font-normal text-gabu-100 transition-colors duration-300 hover:bg-gabu-500"
                />
            </div>
        </Modal>
    );
}
