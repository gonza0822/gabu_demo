'use client';

import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Cross from "@/components/svg/Cross";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { formatNumberEs } from "@/util/number/formatNumberEs";
import { findIdCencosByCodcia } from "@/util/costCenter/findIdCencosByCodcia";

type RowData = Record<string, unknown>;

type TransferSupportResponse = {
    costCenters?: { idCencos: string; codcia: string }[];
    existingAssets?: { idCodigo: string; descripcion: string | null }[];
};

function normalizeKey(key: string): string {
    return key.trim().toLowerCase();
}

function getRowValueByField(row: RowData, fieldId: string): unknown {
    if (fieldId in row) return row[fieldId];
    const normalized = normalizeKey(fieldId);
    const match = Object.keys(row).find((k) => normalizeKey(k) === normalized);
    return match ? row[match] : undefined;
}

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
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    return `${year}${month}`;
}

function toOriginDateFromPeriod(value: unknown): string {
    const yyyymm = toYyyymm(value);
    if (!yyyymm) return "-";
    const year = yyyymm.slice(0, 4);
    const month = yyyymm.slice(4, 6);
    return `01-${month}-${year}`;
}

function toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const maybe = value as { s?: unknown; e?: unknown; d?: unknown };
        if (typeof maybe.s === "number" && typeof maybe.e === "number" && Array.isArray(maybe.d) && maybe.d.length > 0) {
            const digits = `${maybe.d[0]}${maybe.d.slice(1).map((chunk) => String(chunk).padStart(7, "0")).join("")}`;
            const base = Number(digits);
            if (!Number.isFinite(base)) return 0;
            const exponent = maybe.e - (digits.length - 1);
            const factor = Math.pow(10, exponent);
            return (maybe.s < 0 ? -1 : 1) * base * factor;
        }
    }
    return 0;
}

function firstNonEmpty(rows: RowData[], field: string): string {
    for (const row of rows) {
        const value = getRowValueByField(row, field);
        if (value == null) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return "-";
}

function firstNonEmptyValue(rows: RowData[], field: string): unknown {
    for (const row of rows) {
        const value = getRowValueByField(row, field);
        if (value == null) continue;
        if (String(value).trim() !== "") return value;
    }
    return null;
}

export default function ChargesTransferModal({
    isOpen,
    onClose,
    client,
    selectedRows,
    target = "fixedAssets",
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    client: string;
    selectedRows: RowData[];
    target?: "fixedAssets" | "simulation";
    onSuccess?: () => void;
}): React.ReactElement {
    const [transferMode, setTransferMode] = useState<"new" | "improve">("new");
    const [amountCurrency, setAmountCurrency] = useState<"pesos" | "dolares">("pesos");
    const [costCenters, setCostCenters] = useState<{ idCencos: string; codcia: string }[]>([]);
    const [existingAssetsOptions, setExistingAssetsOptions] = useState<{ key: string; value: string }[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setTransferMode("new");
        setAmountCurrency("pesos");
        setSelectedAssetId("");
        setSubmitError(null);
        setIsSubmitting(false);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !client) return;
        let ignore = false;
        (async () => {
            try {
                const response = await fetch("/api/investments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        petition: target === "simulation" ? "GetTransferSupportSimulation" : "GetTransferSupport",
                        client,
                        data: { type: "charges" },
                    }),
                });
                if (!response.ok) return;
                const json = (await response.json()) as TransferSupportResponse;
                if (ignore) return;
                setCostCenters(json.costCenters ?? []);
                setExistingAssetsOptions(
                    (json.existingAssets ?? []).map((row) => ({
                        key: row.idCodigo,
                        value: row.descripcion ? `${row.idCodigo} - ${row.descripcion}` : row.idCodigo,
                    }))
                );
            } catch {
                if (!ignore) {
                    setCostCenters([]);
                    setExistingAssetsOptions([]);
                }
            }
        })();
        return () => {
            ignore = true;
        };
    }, [isOpen, client, target]);

    const summary = useMemo(() => {
        const rows = selectedRows;
        const chargeCodcia = firstNonEmptyValue(rows, "codcia");
        const idCencos = findIdCencosByCodcia(costCenters, chargeCodcia);
        const matchingCostCenter = idCencos ?? "-";
        const dsarticuloValues = Array.from(
            new Set(
                rows
                    .map((row) => String(getRowValueByField(row, "dsarticulo") ?? "").trim())
                    .filter((value) => value !== "")
            )
        );
        const descripcion =
            dsarticuloValues.length === 1 ? dsarticuloValues[0] : firstNonEmpty(rows, "DSOBRA");
        const totalPesos = rows.reduce((acc, row) => acc + toNumber(getRowValueByField(row, "importePesos")), 0);
        const totalDolares = rows.reduce((acc, row) => acc + toNumber(getRowValueByField(row, "importeDolares")), 0);

        return {
            cuenta: firstNonEmpty(rows, "codcta"),
            centroCosto: matchingCostCenter,
            fechaOrigen: toOriginDateFromPeriod(firstNonEmpty(rows, "feccbt")),
            proyecto: firstNonEmpty(rows, "cdobra"),
            ordenTrabajo: firstNonEmpty(rows, "cdcuenta"),
            descripcion: descripcion || "-",
            importePesos: formatNumberEs(totalPesos, 2, 2),
            importeDolares: formatNumberEs(totalDolares, 2, 2),
        };
    }, [selectedRows, costCenters]);

    const infoRows = [
        { label: "Cuenta", value: summary.cuenta },
        { label: "Centro de costo", value: summary.centroCosto },
        { label: "Fecha de origen", value: summary.fechaOrigen },
        { label: "Proyecto", value: summary.proyecto },
        { label: "Orden de trabajo", value: summary.ordenTrabajo },
        { label: "Descripcion", value: summary.descripcion },
        { label: "Importe en pesos", value: summary.importePesos },
        { label: "Importe en dolares", value: summary.importeDolares },
    ];

    const handleConfirm = async () => {
        if (!client) {
            setSubmitError("Cliente no disponible.");
            return;
        }
        if (selectedRows.length === 0) {
            setSubmitError("No hay cargos seleccionados.");
            return;
        }
        if (target === "fixedAssets") {
            const hasBlocked = selectedRows.some((row) => Boolean(getRowValueByField(row, "__chargeBlocked")));
            if (hasBlocked) {
                setSubmitError("Hay cargos transferidos seleccionados. Esos cargos solo pueden transferirse a simulación.");
                return;
            }
        }
        if (transferMode === "improve" && !selectedAssetId) {
            setSubmitError("Debe seleccionar un bien existente para generar mejora.");
            return;
        }

        setSubmitError(null);
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/investments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: target === "simulation" ? "TransferChargesSimulation" : "TransferCharges",
                    client,
                    data: {
                        type: "charges",
                        selectedRows,
                        transferMode,
                        amountCurrency,
                        selectedAssetId: transferMode === "improve" ? selectedAssetId : null,
                    },
                }),
            });
            const json = (await response.json()) as { message?: string };
            if (!response.ok) {
                throw new Error(json.message ?? "Error al transferir cargos.");
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error al transferir cargos.";
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    const transferModeRadioName = `charges-transfer-mode-${target}`;
    const transferCurrencyRadioName = `charges-transfer-currency-${target}`;

    return (
        <Modal
            isOpen={isOpen}
            style="asset-modal-scroll fixed left-1/2 top-1/2 w-[min(56rem,94vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-gabu-900 bg-gabu-100 p-5 shadow-xl sm:p-6"
        >
            <div className="mb-4 flex items-center justify-between border-b border-gabu-500 pb-3">
                <h3 className="text-lg font-semibold text-gabu-900">
                    {target === "simulation" ? "Transferir cargos a simulación" : "Transferir cargos"}
                </h3>
                <button type="button" onClick={onClose} className="rounded p-1 transition-colors hover:bg-gabu-300" aria-label="Cerrar">
                    <Cross style="h-5 w-5 fill-current text-gabu-900" onClick={onClose} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-md border border-gabu-900/30 bg-gabu-500/25 p-4 md:grid-cols-2">
                {infoRows.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <span className="min-w-[9rem] text-sm font-semibold text-gabu-900">{item.label}:</span>
                        <span className="text-sm text-gabu-900">{item.value}</span>
                    </div>
                ))}
            </div>

            <div className="mt-5 rounded-md border border-gabu-900/30 bg-gabu-500/25 p-4">
                <p className="mb-3 text-sm font-semibold text-gabu-900">Opciones</p>
                {target === "simulation" ? (
                    <div className="mb-4 rounded-md border border-gabu-900/20 bg-gabu-100/70 p-3">
                        <p className="mb-2 text-sm font-semibold text-gabu-900">Importe a transferir</p>
                        <label className="mb-2 flex cursor-pointer items-center gap-2">
                            <input
                                type="radio"
                                name={transferCurrencyRadioName}
                                checked={amountCurrency === "pesos"}
                                onChange={() => setAmountCurrency("pesos")}
                                className="h-4 w-4 cursor-pointer accent-gabu-900"
                            />
                            <span className="text-sm text-gabu-900">Pesos (importePesos)</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                            <input
                                type="radio"
                                name={transferCurrencyRadioName}
                                checked={amountCurrency === "dolares"}
                                onChange={() => setAmountCurrency("dolares")}
                                className="h-4 w-4 cursor-pointer accent-gabu-900"
                            />
                            <span className="text-sm text-gabu-900">Dólares (importeDolares)</span>
                        </label>
                    </div>
                ) : null}
                <label className="mb-3 flex cursor-pointer items-start gap-2">
                    <input
                        type="radio"
                        name={transferModeRadioName}
                        checked={transferMode === "new"}
                        onChange={() => setTransferMode("new")}
                        className="mt-1 h-4 w-4 cursor-pointer accent-gabu-900"
                    />
                    <span className="text-sm text-gabu-900">
                        <strong>Generar un bien</strong>
                        <br />
                        Crear un nuevo bien.
                    </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                    <input
                        type="radio"
                        name={transferModeRadioName}
                        checked={transferMode === "improve"}
                        onChange={() => setTransferMode("improve")}
                        className="mt-1 h-4 w-4 cursor-pointer accent-gabu-900"
                    />
                    <span className="text-sm text-gabu-900">
                        <strong>Generar una mejora sobre un bien existente</strong>
                    </span>
                </label>
                {transferMode === "improve" ? (
                    <div className="mt-3 w-full max-w-[32rem]">
                        <label className="mb-1 block text-sm font-normal text-gabu-900">Bien existente</label>
                        <SearchableSelect
                            label="Bien existente"
                            hasLabel={false}
                            options={existingAssetsOptions.length > 0 ? existingAssetsOptions : [{ key: "", value: "-" }]}
                            value={selectedAssetId}
                            onChange={(option) => {
                                setSelectedAssetId(option?.key ?? "");
                            }}
                        />
                    </div>
                ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-gabu-500 pt-4">
                {submitError ? (
                    <p className="mr-auto self-center text-sm text-gabu-error">{submitError}</p>
                ) : null}
                <button
                    type="button"
                    className="rounded-md border border-gabu-900/30 bg-gabu-300 px-4 py-1.5 font-normal text-gabu-900 transition-colors duration-300 hover:bg-gabu-100"
                    onClick={onClose}
                    disabled={isSubmitting}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    className="rounded-md border border-gabu-900/30 bg-gabu-900 px-4 py-1.5 font-normal text-gabu-100 transition-colors duration-300 hover:bg-gabu-500 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleConfirm()}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Procesando..." : "Confirmar"}
                </button>
            </div>
        </Modal>
    );
}
