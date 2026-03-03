'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import ToggleSwitch from "@/components/ui/ToggleSwitch";

const PANEL_WIDTH_PX = 320;
const PANEL_HEIGHT_PX = 400;
const GAP_TOP_PX = 8;

export type ManageFieldItem = { IdCampo: string; BrowNombre: string | null };

type TriggerRect = { top: number; left: number; width: number; height: number };

function rectToStyle(rect: TriggerRect): React.CSSProperties {
  const right = rect.left + rect.width;
  const top = rect.top + rect.height + GAP_TOP_PX;
  const left = Math.max(8, right - PANEL_WIDTH_PX);
  const maxTop = typeof window !== 'undefined' ? window.innerHeight - PANEL_HEIGHT_PX - 8 : top;
  return {
    position: 'fixed' as const,
    top: Math.min(top, maxTop),
    left,
    width: PANEL_WIDTH_PX,
    minHeight: 320,
    maxHeight: PANEL_HEIGHT_PX,
    zIndex: 9999,
  };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: TriggerRect | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
  fields: ManageFieldItem[];
  visibleIds: string[];
  onVisibilityChange: (fieldId: string, listShow: boolean) => void;
  client: string;
};

export default function ManageFieldsPanel({
  isOpen,
  onClose,
  triggerRect,
  triggerRef,
  fields,
  visibleIds,
  onVisibilityChange,
  client,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [exitingRect, setExitingRect] = useState<TriggerRect | null>(null);
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (triggerRect) setExitingRect(triggerRect);
  }, [triggerRect]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      setPosition(null);
      return;
    }
    const updatePosition = () => {
      const rect = triggerRef?.current?.getBoundingClientRect();
      if (rect) {
        setPosition(rectToStyle({ top: rect.top, left: rect.left, width: rect.width, height: rect.height }));
      } else if (triggerRect) {
        setPosition(rectToStyle(triggerRect));
      }
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, triggerRect, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (panelRef.current?.contains(target as Node)) return;
      if (target.closest?.('[data-manage-fields-trigger]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const hiddenFields = useMemo(() => fields.filter(f => !visibleIds.includes(f.IdCampo)), [fields, visibleIds]);
  const shownFields = useMemo(() => fields.filter(f => visibleIds.includes(f.IdCampo)), [fields, visibleIds]);

  const searchLower = search.trim().toLowerCase();
  const filteredShown = useMemo(
    () => searchLower
      ? shownFields.filter(f => (f.BrowNombre ?? f.IdCampo).toLowerCase().includes(searchLower))
      : shownFields,
    [shownFields, searchLower]
  );
  const filteredHidden = useMemo(
    () => searchLower
      ? hiddenFields.filter(f => (f.BrowNombre ?? f.IdCampo).toLowerCase().includes(searchLower))
      : hiddenFields,
    [hiddenFields, searchLower]
  );

  const toggle = async (fieldId: string) => {
    const listShow = !visibleIds.includes(fieldId);
    onVisibilityChange(fieldId, listShow);
    try {
      const res = await fetch('/api/fixedAssets/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petition: 'SetListShow',
          client,
          data: { fieldId, listShow },
        }),
      });
      if (!res.ok) onVisibilityChange(fieldId, !listShow);
    } catch {
      onVisibilityChange(fieldId, !listShow);
    }
  };

  const hideAll = () => {
    visibleIds.forEach(id => onVisibilityChange(id, false));
    visibleIds.forEach(id => {
      fetch('/api/fixedAssets/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petition: 'SetListShow', client, data: { fieldId: id, listShow: false } }),
      }).catch(() => onVisibilityChange(id, true));
    });
  };

  const showAll = () => {
    hiddenFields.forEach(f => onVisibilityChange(f.IdCampo, true));
    hiddenFields.forEach(f => {
      fetch('/api/fixedAssets/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petition: 'SetListShow', client, data: { fieldId: f.IdCampo, listShow: true } }),
      }).catch(() => onVisibilityChange(f.IdCampo, false));
    });
  };

  const showPopup = isOpen && (triggerRect ?? exitingRect);
  const rectForPosition = triggerRect ?? exitingRect;
  const shouldRenderPortal = showPopup || exitingRect;

  if (typeof document === 'undefined' || !shouldRenderPortal || !rectForPosition) return null;

  const style = position ?? rectToStyle(rectForPosition);

  const content = (
    <AnimatePresence onExitComplete={() => setExitingRect(null)}>
      {showPopup ? (
        <motion.div
          key="manage-fields-panel"
          ref={panelRef}
          className="bg-gabu-700 rounded-2xl p-3 flex flex-col gap-2 shadow-xl border border-gabu-900 min-h-[20em] max-h-[25em]"
          style={style}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <span className="absolute -top-1.5 end-5 w-4 h-4 bg-gabu-700 rotate-45 rounded-sm" aria-hidden />
          <p className="text-lg text-gabu-100 text-center">Administrar campos</p>
          <div className="flex bg-gabu-100 rounded-md py-1.5 px-3 gap-2 items-center">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-current text-gabu-900 shrink-0">
              <path d="M16 16L12.2032 12.2032M12.2032 12.2032C12.8126 11.5938 13.296 10.8703 13.6258 10.0741C13.9556 9.2779 14.1254 8.42451 14.1254 7.56269C14.1254 6.70086 13.9556 5.84748 13.6258 5.05126C13.296 4.25503 12.8126 3.53157 12.2032 2.92217C11.5938 2.31276 10.8703 1.82936 10.0741 1.49955C9.2779 1.16975 8.42451 1 7.56269 1C6.70086 1 5.84748 1.16975 5.05126 1.49955C4.25503 1.82936 3.53157 2.31277 2.92217 2.92217C1.69142 4.15291 1 5.82216 1 7.56269C1 9.30322 1.69142 10.9725 2.92217 12.2032C4.15291 13.434 5.82216 14.1254 7.56269 14.1254C9.30322 14.1254 10.9725 13.434 12.2032 12.2032Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar campo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus:outline-none text-gabu-700 w-full bg-transparent"
            />
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 border-separate border-spacing-3 fields-table">
            <table className="border-separate border-spacing-3 w-full">
              <thead>
                <tr>
                  <th className="text-sm text-gabu-100 text-start font-normal">Se muestran</th>
                  <th className="text-xs text-gabu-100 text-end font-normal">
                    <button type="button" onClick={hideAll} className="cursor-pointer hover:underline whitespace-nowrap">
                      Ocultar todo
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShown.map((field) => (
                  <tr key={field.IdCampo}>
                    <td className="text-gabu-100 text-xs">{field.BrowNombre ?? field.IdCampo}</td>
                    <td>
                      <div className="flex items-center justify-end">
                        <ToggleSwitch on onClick={() => toggle(field.IdCampo)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="border-separate border-spacing-3 w-full">
              <thead>
                <tr>
                  <th className="text-sm text-gabu-100 text-start font-normal">Se ocultan</th>
                  <th className="text-xs text-gabu-100 text-end font-normal">
                    <button type="button" onClick={showAll} className="cursor-pointer hover:underline">
                      Mostrar todo
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredHidden.map((field) => (
                  <tr key={field.IdCampo}>
                    <td className="text-gabu-100 text-xs">{field.BrowNombre ?? field.IdCampo}</td>
                    <td>
                      <div className="flex items-center justify-end">
                        <ToggleSwitch on={false} onClick={() => toggle(field.IdCampo)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
