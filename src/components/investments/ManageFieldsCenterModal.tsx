'use client';

import React, { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import Cross from "@/components/svg/Cross";
import type { ConverFieldModel } from "@/generated/prisma/models";
import type { InvestmentType } from "@/lib/models/investments/Investments";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    fields: ConverFieldModel[];
    visibleIds: string[];
    onVisibilityChange: (fieldId: string, listShow: boolean) => void;
    client: string;
    type: InvestmentType;
};

export default function ManageFieldsCenterModal({
    isOpen,
    onClose,
    fields,
    visibleIds,
    onVisibilityChange,
    client,
    type,
}: Props): React.ReactElement {
    const [search, setSearch] = useState("");

    const hiddenFields = useMemo(() => fields.filter((f) => !visibleIds.includes(f.IdCampo)), [fields, visibleIds]);
    const searchLower = search.trim().toLowerCase();
    const filteredFields = useMemo(
        () =>
            searchLower
                ? fields.filter((f) => (f.BrowNombre ?? f.IdCampo).toLowerCase().includes(searchLower))
                : fields,
        [fields, searchLower]
    );

    const persist = async (fieldId: string, listShow: boolean) => {
        const res = await fetch("/api/investments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                petition: "SetListShow",
                client,
                data: { type, fieldId, listShow },
            }),
        });
        return res.ok;
    };

    const toggle = async (fieldId: string) => {
        const listShow = !visibleIds.includes(fieldId);
        onVisibilityChange(fieldId, listShow);
        try {
            const ok = await persist(fieldId, listShow);
            if (!ok) onVisibilityChange(fieldId, !listShow);
        } catch {
            onVisibilityChange(fieldId, !listShow);
        }
    };

    const hideAll = () => {
        visibleIds.forEach((id) => {
            onVisibilityChange(id, false);
            persist(id, false).catch(() => onVisibilityChange(id, true));
        });
    };

    const showAll = () => {
        hiddenFields.forEach((f) => {
            onVisibilityChange(f.IdCampo, true);
            persist(f.IdCampo, true).catch(() => onVisibilityChange(f.IdCampo, false));
        });
    };

    return (
        <Modal isOpen={isOpen} style="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 p-0 bg-transparent border-none outline-none backdrop:bg-gabu-900/40">
            <div className="w-[420px] max-w-[94vw] max-h-[80vh] bg-gabu-700 rounded-2xl p-3 flex flex-col gap-2 shadow-xl border border-gabu-900">
                <div className="flex items-center justify-between">
                    <p className="text-lg text-gabu-100">Administrar campos</p>
                    <button type="button" aria-label="Cerrar" className="p-1 rounded-md hover:bg-gabu-500 cursor-pointer" onClick={onClose}>
                        <Cross style="h-5 w-5 fill-current text-gabu-100 hover:text-gabu-300" onClick={onClose} />
                    </button>
                </div>
                <div className="flex bg-gabu-100 rounded-md py-1.5 px-3 gap-2 items-center">
                    <input
                        type="text"
                        placeholder="Buscar campo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="focus:outline-none text-gabu-700 w-full bg-transparent"
                    />
                </div>
                <div className="flex items-center justify-between gap-2 px-1 shrink-0">
                    <span className="text-sm text-gabu-100">Campos</span>
                    <div className="flex items-center gap-3 shrink-0">
                        <button type="button" onClick={hideAll} className="text-xs text-gabu-100 cursor-pointer hover:underline whitespace-nowrap">
                            Ocultar todo
                        </button>
                        <button type="button" onClick={showAll} className="text-xs text-gabu-100 cursor-pointer hover:underline whitespace-nowrap">
                            Mostrar todo
                        </button>
                    </div>
                </div>
                <div
                    className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 fields-table pr-2 mr-1"
                    style={{ scrollbarGutter: "stable" }}
                >
                    <table className="w-full table-fixed">
                        <tbody>
                            {filteredFields.map((field) => (
                                <tr key={field.IdCampo}>
                                    <td
                                        className="text-gabu-100 text-xs py-1 pr-2 whitespace-nowrap overflow-hidden text-ellipsis"
                                        title={field.BrowNombre ?? field.IdCampo}
                                    >
                                        {field.BrowNombre ?? field.IdCampo}
                                    </td>
                                    <td className="w-12 py-1">
                                        <div className="flex items-center justify-end">
                                            <ToggleSwitch
                                                on={visibleIds.includes(field.IdCampo)}
                                                onClick={() => void toggle(field.IdCampo)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}
