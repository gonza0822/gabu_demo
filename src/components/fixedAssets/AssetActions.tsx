'use client';

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import Arrow from "../svg/Arrow";

const POPUP_WIDTH_PX = 208;
const POPUP_HEIGHT_PX = 224;
const GAP_PX = -15;
const ARROW_OFFSET_TOP_PX = 15;

export type ActionId = 'clonar' | 'alta-agregado' | 'baja' | 'baja-fisica' | 'apertura-bienes' | 'transferencia';

const ACTIONS: { id: ActionId; label: string }[] = [
  { id: 'clonar', label: 'Clonar' },
  { id: 'alta-agregado', label: 'Alta agregado' },
  { id: 'baja', label: 'Baja' },
  { id: 'baja-fisica', label: 'Baja fisica' },
  { id: 'apertura-bienes', label: 'Apertura de bienes' },
  { id: 'transferencia', label: 'Transferencia' },
];

type TriggerRect = { top: number; left: number; width: number; height: number };

function rectToStyle(rect: TriggerRect): React.CSSProperties {
  const triggerCenterY = rect.top + rect.height / 2;
  const left = rect.left - POPUP_WIDTH_PX - GAP_PX;
  const top = triggerCenterY - ARROW_OFFSET_TOP_PX;
  return {
    position: 'fixed' as const,
    top: Math.max(8, Math.min(top, typeof window !== 'undefined' ? window.innerHeight - POPUP_HEIGHT_PX - 8 : top)),
    left: Math.max(8, left),
    width: POPUP_WIDTH_PX,
    zIndex: 9999,
  };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: TriggerRect | null;
  rowId: string | null;
  onAction?: (rowId: string, actionId: ActionId) => void;
};

export default function AssetActions({
  isOpen,
  onClose,
  triggerRect,
  rowId,
  onAction,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [exitingRect, setExitingRect] = useState<TriggerRect | null>(null);

  useEffect(() => {
    if (triggerRect) setExitingRect(triggerRect);
  }, [triggerRect]);

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
      if (popupRef.current?.contains(target as Node)) return;
      if (target.closest?.('[data-asset-actions-trigger]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const showPopup = isOpen && (triggerRect ?? exitingRect);
  const rectForPosition = triggerRect ?? exitingRect;
  const shouldRenderPortal = showPopup || exitingRect;

  if (typeof document === 'undefined' || !shouldRenderPortal || !rectForPosition) return null;

  const style = rectToStyle(rectForPosition);

  const content = (
    <AnimatePresence onExitComplete={() => setExitingRect(null)}>
      {showPopup ? (
        <motion.div
          key="asset-actions-popup"
          ref={popupRef}
          className="min-h-[14em] w-[13em] bg-gabu-700 rounded-xl flex flex-col shadow-xl border border-gabu-900"
          style={style}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
        <span
          className="absolute top-2 -end-1.5 w-4 h-4 bg-gabu-700 rotate-45 rounded-sm"
          aria-hidden
        />
        <p className="text-lg text-gabu-100 w-full text-center p-1 border-2 border-gabu-100/20">
          Acciones
        </p>
        <div className="flex flex-col w-full gap-1 my-1 flex-1 overflow-auto">
          {ACTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-5 py-1 w-full text-left border-0 bg-transparent"
              onClick={() => {
                if (rowId) onAction?.(rowId, id);
                onClose();
              }}
            >
              <span className="text-gabu-100">{label}</span>
              <span className="shrink-0">
                <Arrow height={9} width={9} color="text-gabu-100" defaultRotation="-rotate-0" activeRotation="-rotate-0" active={false} />
              </span>
            </button>
          ))}
        </div>
      </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
