'use client';

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import Arrow from "../svg/Arrow";

const POPUP_WIDTH_PX = 192;
const POPUP_MAX_HEIGHT_PX = 280;
const VIEWPORT_MARGIN_PX = 8;
const GAP_PX = -8;
const ARROW_SIZE_PX = 16;

export type ActionId = 'modificar' | 'consultar' | 'clonar' | 'alta-agregado' | 'baja' | 'baja-fisica' | 'apertura-bienes' | 'transferencia';

const ACTIONS: { id: ActionId; label: string }[] = [
  { id: 'modificar', label: 'Modificar' },
  { id: 'consultar', label: 'Consultar' },
  { id: 'clonar', label: 'Clonar' },
  { id: 'alta-agregado', label: 'Alta agregado' },
  { id: 'baja', label: 'Baja' },
  { id: 'baja-fisica', label: 'Baja fisica' },
  { id: 'apertura-bienes', label: 'Apertura de bienes' },
  { id: 'transferencia', label: 'Transferencia' },
];

type TriggerRect = { top: number; left: number; width: number; height: number };

function getPopupLayout(rect: TriggerRect): { style: React.CSSProperties; arrowTop: number } {
  if (typeof window === 'undefined') {
    return {
      style: {
        position: 'fixed',
        top: VIEWPORT_MARGIN_PX,
        left: VIEWPORT_MARGIN_PX,
        width: POPUP_WIDTH_PX,
        maxHeight: POPUP_MAX_HEIGHT_PX,
        zIndex: 9999,
      },
      arrowTop: 12,
    };
  }

  const popupHeight = Math.min(POPUP_MAX_HEIGHT_PX, window.innerHeight - VIEWPORT_MARGIN_PX * 2);
  const triggerCenterY = rect.top + rect.height / 2;
  const preferredLeft = rect.left - POPUP_WIDTH_PX - GAP_PX;
  const preferredTop = triggerCenterY - 20;

  const maxLeft = window.innerWidth - POPUP_WIDTH_PX - VIEWPORT_MARGIN_PX;
  const maxTop = window.innerHeight - popupHeight - VIEWPORT_MARGIN_PX;
  const left = Math.max(VIEWPORT_MARGIN_PX, Math.min(preferredLeft, maxLeft));
  const top = Math.max(VIEWPORT_MARGIN_PX, Math.min(preferredTop, maxTop));

  const arrowTopRaw = triggerCenterY - top - ARROW_SIZE_PX / 2;
  const arrowTop = Math.max(12, Math.min(arrowTopRaw, popupHeight - ARROW_SIZE_PX - 8));

  return {
    style: {
      position: 'fixed' as const,
      top,
      left,
      width: POPUP_WIDTH_PX,
      maxHeight: popupHeight,
      zIndex: 9999,
    },
    arrowTop,
  };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  triggerRect: TriggerRect | null;
  rowId: string | null;
  onAction?: (rowId: string, actionId: ActionId) => void;
  allowedActions?: ActionId[];
};

export default function AssetActions({
  isOpen,
  onClose,
  triggerRect,
  rowId,
  onAction,
  allowedActions,
}: Props) {
  const visibleActions = allowedActions?.length
    ? ACTIONS.filter(({ id }) => allowedActions.includes(id))
    : ACTIONS;

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

  const { style, arrowTop } = getPopupLayout(rectForPosition);

  const content = (
    <AnimatePresence onExitComplete={() => setExitingRect(null)}>
      {showPopup ? (
        <motion.div
          key="asset-actions-popup"
          ref={popupRef}
          className="w-[12rem] bg-gabu-700 rounded-xl flex flex-col shadow-xl border border-gabu-900"
          style={style}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
        <span
          className="absolute -end-1.5 w-4 h-4 bg-gabu-700 rotate-45 rounded-sm"
          style={{ top: arrowTop }}
          aria-hidden
        />
        <p className="text-base text-gabu-100 w-full text-center p-1 border-2 border-gabu-100/20">
          Acciones
        </p>
        <div className="flex flex-col w-full gap-1 my-1 flex-1 overflow-y-auto">
          {visibleActions.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="flex justify-between items-center cursor-pointer hover:bg-gabu-500 transition-colors duration-300 px-4 py-0.5 w-full text-left border-0 bg-transparent"
              onClick={() => {
                if (rowId) onAction?.(rowId, id);
                onClose();
              }}
            >
              <span className="text-gabu-100 text-sm">{label}</span>
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
