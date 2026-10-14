'use client';

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Cross from "@/components/svg/Cross";
import { buildAssetQrPayload } from "@/lib/fixedAssets/assetQr";
import { printAssetQrStickers } from "@/lib/fixedAssets/printAssetQrs";

export default function AssetQrModal({
    isOpen,
    onClose,
    bienId,
    descripcion,
}: {
    isOpen: boolean;
    onClose: () => void;
    bienId: string;
    descripcion?: string;
}): React.ReactElement {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setDataUrl(null);
            setError(null);
            return;
        }
        let cancelled = false;
        try {
            const payload = buildAssetQrPayload(bienId);
            QRCode.toDataURL(payload, { margin: 1, width: 320, errorCorrectionLevel: "M" })
                .then((url) => {
                    if (!cancelled) setDataUrl(url);
                })
                .catch(() => {
                    if (!cancelled) setError("No se pudo generar el código QR.");
                });
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo generar el código QR.");
        }
        return () => {
            cancelled = true;
        };
    }, [isOpen, bienId]);

    function handlePrint() {
        if (!dataUrl) return;
        void printAssetQrStickers([{ bienId, descripcion }]).catch(() => {
            setError("No se pudo abrir la impresión.");
        });
    }

    return (
        <Modal
            isOpen={isOpen}
            style="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-xl bg-gabu-700 border border-gabu-900 shadow-xl p-4 w-[min(92vw,28rem)] relative z-[10010]"
        >
            <div className="flex shrink-0 justify-between items-center border-b border-gabu-500 pb-3 mb-3">
                <p className="text-lg text-gabu-100 font-medium">Código QR</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded hover:bg-gabu-500 transition-colors"
                    aria-label="Cerrar"
                >
                    <Cross style="h-6 w-6 fill-current text-gabu-100 cursor-pointer" onClick={onClose} />
                </button>
            </div>
            <div className="flex flex-col items-center gap-3 py-2">
                {error ? (
                    <p className="text-sm text-gabu-error">{error}</p>
                ) : dataUrl ? (
                    <img
                        src={dataUrl}
                        alt={`Código QR del bien ${bienId}`}
                        className="w-[16rem] h-[16rem] bg-gabu-100 rounded-md p-2"
                    />
                ) : (
                    <p className="text-sm text-gabu-100">Generando…</p>
                )}
                <p className="text-gabu-100 text-sm font-medium">{bienId}</p>
                {descripcion?.trim() ? (
                    <p className="text-gabu-300 text-xs text-center px-2">{descripcion.trim()}</p>
                ) : null}
            </div>
            <div className="flex shrink-0 justify-end gap-3 pt-3 mt-3 border-t border-gabu-500">
                <Button
                    text="Cerrar"
                    type="button"
                    handleClick={onClose}
                    style="font-normal text-gabu-900 bg-gabu-300 rounded-md hover:bg-gabu-100 cursor-pointer transition-colors duration-300 px-4 py-2"
                />
                <Button
                    text="Imprimir"
                    type="button"
                    disabled={!dataUrl}
                    handleClick={handlePrint}
                    style="font-normal text-gabu-100 bg-gabu-900 rounded-md hover:bg-gabu-500 cursor-pointer transition-colors duration-300 px-4 py-2"
                />
            </div>
        </Modal>
    );
}
