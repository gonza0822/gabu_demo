"use client";

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState } from "@/store";
import { authorizationActions } from "@/store/authorizationSlice";
import { clearFixedAssetsBootstrapCache } from "@/lib/cache/fixedAssetsBootstrapCache";
import { clearLibrosFormCache } from "@/lib/cache/librosFormCache";
import AssetQrScanner from "./AssetQrScanner";
import { buildAssetScanSummary, type AssetScanSummary, type InventarioBienRow } from "@/lib/fixedAssets/scanAssetSummary";

export default function MobileScanHub(): React.ReactElement {
    const dispatch = useDispatch();
    const router = useRouter();
    const client = useSelector((state: RootState) => state.authorization.client);
    const user = useSelector((state: RootState) => state.authorization.user);
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [savingEstado, setSavingEstado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<AssetScanSummary | null>(null);
    const [lastEstado, setLastEstado] = useState<InventarioBienRow | null>(null);

    async function handleCloseSession() {
        await fetch("/api/user?closeSession=true");
        if (client) {
            clearFixedAssetsBootstrapCache(client);
            clearLibrosFormCache(client);
        }
        try {
            window.localStorage.removeItem("gabu-client");
        } catch {
            /* noop */
        }
        dispatch(authorizationActions.logout());
        router.push("/");
    }

    async function loadLastEstado(bienId: string) {
        try {
            const res = await fetch("/api/fixedAssets/inventario", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "GetLast",
                    client,
                    data: { bienId },
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setLastEstado(null);
                return;
            }
            setLastEstado((data?.last as InventarioBienRow | null) ?? null);
        } catch {
            setLastEstado(null);
        }
    }

    async function loadBien(bienId: string) {
        setLoading(true);
        setError(null);
        setLastEstado(null);
        try {
            const res = await fetch("/api/fixedAssets/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "GetBienData",
                    client,
                    data: { bienId },
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(typeof data?.message === "string" ? data.message : "No se encontró el bien.");
                setSummary(null);
                return;
            }
            setSummary(buildAssetScanSummary(bienId, data as Record<string, unknown>));
            void loadLastEstado(bienId);
        } catch {
            setError("No se pudo consultar el bien.");
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }

    async function confirmEstado() {
        if (!summary || savingEstado) return;
        setSavingEstado(true);
        setError(null);
        try {
            const res = await fetch("/api/fixedAssets/inventario", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petition: "Confirm",
                    client,
                    data: { bienId: summary.bienId },
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(typeof data?.message === "string" ? data.message : "No se pudo actualizar el estado.");
                return;
            }
            setLastEstado(data as InventarioBienRow);
        } catch {
            setError("No se pudo actualizar el estado.");
        } finally {
            setSavingEstado(false);
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-gabu-900">
            <header className="flex items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gabu-100 p-1.5">
                        <img src="/assets/gabu_logo.png" alt="GABU" className="h-8 w-8 object-contain" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gabu-100">Inventario</p>
                        <p className="text-xs text-gabu-300">{user ?? client}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        void handleCloseSession();
                    }}
                    className="min-h-11 rounded-xl px-3 text-sm font-medium text-gabu-100 transition-colors duration-200 hover:bg-gabu-700 cursor-pointer"
                >
                    Salir
                </button>
            </header>

            <section className="flex min-h-0 flex-1 flex-col rounded-t-[1.75rem] bg-gabu-100 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6">
                {loading ? (
                    <p className="text-sm text-gabu-700">Buscando el bien…</p>
                ) : summary ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                        {summary.dadoDeBaja ? (
                            <div className="mb-4 rounded-xl border border-gabu-error bg-gabu-error/10 px-4 py-3" role="alert">
                                <p className="text-sm font-semibold text-gabu-error">Bien dado de baja</p>
                                {summary.fecbajLabel ? (
                                    <p className="mt-1 text-xs text-gabu-700">Fecha de baja: {summary.fecbajLabel}</p>
                                ) : null}
                            </div>
                        ) : (
                            <p className="mb-4 text-sm font-medium text-gabu-700">Bien activo</p>
                        )}
                        <p className="text-xs font-medium uppercase tracking-wide text-gabu-500">Código</p>
                        <p className="mt-1 text-lg font-semibold text-gabu-900">{summary.bienId}</p>
                        {summary.descripcion ? (
                            <>
                                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gabu-500">Descripción</p>
                                <p className="mt-1 text-sm leading-relaxed text-gabu-900">{summary.descripcion}</p>
                            </>
                        ) : null}
                        <dl className="mt-5 grid grid-cols-1 gap-3 text-sm">
                            {summary.idPlanta ? (
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-gabu-500">Planta</dt>
                                    <dd className="mt-0.5 text-gabu-900">{summary.idPlanta}</dd>
                                </div>
                            ) : null}
                            {summary.idZona ? (
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-gabu-500">Ubicación</dt>
                                    <dd className="mt-0.5 text-gabu-900">{summary.idZona}</dd>
                                </div>
                            ) : null}
                            {summary.idCencos ? (
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-gabu-500">Centro de costo</dt>
                                    <dd className="mt-0.5 text-gabu-900">{summary.idCencos}</dd>
                                </div>
                            ) : null}
                        </dl>
                        {lastEstado ? (
                            <div className="mt-5 rounded-xl border border-gabu-300 bg-white px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-gabu-500">Último recuento</p>
                                <p className="mt-1 text-sm font-medium text-gabu-900">Estado correcto</p>
                                <p className="mt-0.5 text-xs text-gabu-700">
                                    {lastEstado.fecEstadoLabel} · {lastEstado.idUsuario}
                                </p>
                            </div>
                        ) : null}
                        {error ? (
                            <p className="mt-4 text-sm font-medium text-gabu-error" role="alert">
                                {error}
                            </p>
                        ) : null}
                        <div className="mt-auto flex flex-col gap-3 pt-6">
                            <button
                                type="button"
                                disabled={savingEstado}
                                onClick={() => {
                                    void confirmEstado();
                                }}
                                className="min-h-12 w-full rounded-xl bg-gabu-900 px-4 text-base font-semibold text-gabu-100 transition-colors duration-200 hover:bg-gabu-700 disabled:opacity-60 cursor-pointer"
                            >
                                {savingEstado ? "Guardando…" : "Actualizar estado"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSummary(null);
                                    setLastEstado(null);
                                    setError(null);
                                    setScanning(true);
                                }}
                                className="min-h-12 w-full rounded-xl border border-gabu-300 bg-white px-4 text-base font-semibold text-gabu-900 transition-colors duration-200 hover:bg-gabu-200 cursor-pointer"
                            >
                                Escanear otro
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <p className="text-lg font-semibold tracking-tight text-gabu-900">Escanear bien</p>
                        <p className="mt-2 text-sm leading-relaxed text-gabu-700">
                            Leé el código QR del bien para ver su ficha. Si está dado de baja, te va a avisar.
                        </p>
                        {error ? (
                            <p className="mt-4 text-sm font-medium text-gabu-error" role="alert">
                                {error}
                            </p>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setScanning(true);
                            }}
                            className="mt-auto min-h-12 w-full rounded-xl bg-gabu-900 px-4 text-base font-semibold text-gabu-100 transition-colors duration-200 hover:bg-gabu-700 cursor-pointer"
                        >
                            Escanear bien
                        </button>
                    </div>
                )}
            </section>

            {scanning ? (
                <AssetQrScanner
                    onClose={() => setScanning(false)}
                    onDetect={(bienId) => {
                        setScanning(false);
                        void loadBien(bienId);
                    }}
                />
            ) : null}
        </div>
    );
}
