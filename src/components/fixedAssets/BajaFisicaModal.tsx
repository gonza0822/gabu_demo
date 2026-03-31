'use client';

import React, { useState } from "react";
import Modal from "../ui/Modal";
import Cross from "../svg/Cross";

export default function BajaFisicaModal({
    isOpen,
    onClose,
    bienId,
    client,
    onSuccess,
    onError,
}: {
    isOpen: boolean;
    onClose: () => void;
    bienId: string;
    client: string;
    onSuccess?: () => void;
    onError?: (message: string) => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!client || !bienId) {
            onError?.('Datos insuficientes');
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/fixedAssets/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    petition: 'BajaFisica',
                    client,
                    data: { bienId },
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.message ?? `Error ${res.status}`);
            }
            onSuccess?.();
            onClose();
        } catch (e) {
            onError?.(e instanceof Error ? e.message : String(e));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            style="w-[30vw] min-w-[400px] max-w-[500px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gabu-100 border border-gabu-900 rounded-2xl p-5"
        >
            <div className="flex justify-end -mt-2 -mr-2">
                <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gabu-300 transition-colors" aria-label="Cerrar">
                    <Cross style="h-5 w-5 fill-current text-gabu-900 cursor-pointer" onClick={onClose} />
                </button>
            </div>

            <div className="flex flex-col items-center gap-4 px-4 pb-2">
                <p className="font-semibold text-gabu-900 text-xl text-center">
                    Confirmar baja física
                </p>
                <p className="text-gabu-700 text-center text-sm">
                    ¿Está seguro que desea eliminar permanentemente el bien <span className="font-semibold text-gabu-900">{bienId}</span>?
                </p>
                <p className="text-gabu-error text-center text-xs font-medium">
                    Esta acción no se puede deshacer. Se eliminarán todos los registros del bien (cabecera, distribución y libros contables).
                </p>

                <div className="flex gap-4 w-full justify-center mt-2">
                    <button
                        type="button"
                        className="font-normal text-gabu-100 px-6 py-1.5 bg-gabu-900 rounded-md hover:bg-gabu-700 cursor-pointer transition-colors duration-300"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="font-normal text-gabu-100 px-6 py-1.5 bg-red-700 rounded-md hover:bg-red-600 cursor-pointer transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
