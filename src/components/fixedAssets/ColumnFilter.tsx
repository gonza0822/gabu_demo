'use client';

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Button from "../ui/Button";

const POPUP_WIDTH_PX = 320;

export type ColumnType = 'number' | 'string' | 'date';

export type ColumnFilterValue =
  | { type: 'number'; condition: string; value: string }
  | { type: 'string'; condition: string; value: string }
  | { type: 'date'; desde: string; hasta: string };

const NUMBER_CONDITIONS: { key: string; value: string }[] = [
  { key: 'gt', value: 'Mayor que' },
  { key: 'lt', value: 'Menor que' },
  { key: 'gte', value: 'Mayor o igual que' },
  { key: 'lte', value: 'Menor o igual que' },
  { key: 'eq', value: 'Igual que' },
];

const STRING_CONDITIONS: { key: string; value: string }[] = [
  { key: 'contains', value: 'Contiene' },
  { key: 'equals', value: 'Es igual' },
  { key: 'startsWith', value: 'Comienza con' },
  { key: 'endsWith', value: 'Termina con' },
];

/**
 * Determina el tipo de filtro según el tipo real del valor en los datos (no por el contenido).
 * - Valores numéricos (typeof number) → filtro numérico (ej. impuestos.amafieactual).
 * - Fechas (Date o string YYYY-MM-DD) → filtro fecha.
 * - El resto (strings aunque contengan dígitos, ej. cabecera.idcodigo "022822") → filtro string.
 */
export function getColumnType(columnId: string, sampleValue: unknown): ColumnType {
  if (sampleValue == null || sampleValue === '') return 'string';
  if (typeof sampleValue === 'number' && !isNaN(sampleValue)) return 'number';
  if (sampleValue instanceof Date && !isNaN(sampleValue.getTime())) return 'date';
  const str = String(sampleValue).trim();
  const lowerId = columnId.toLowerCase();
  if (lowerId.includes('fec') || lowerId.includes('fecha') || lowerId.includes('date')) {
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'date';
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return 'date';
  return 'string';
}

type Props = {
  columnId: string;
  columnType: ColumnType;
  isOpen: boolean;
  /** When true, run exit animation and then call onClose (so close animation is visible). */
  isClosing?: boolean;
  onClose: () => void;
  onApply: (value: ColumnFilterValue) => void;
  initialValue?: ColumnFilterValue | null;
  /** When provided, popup is rendered in a portal with position:fixed so it is not clipped by overflow. */
  anchorRef?: React.RefObject<HTMLElement | null>;
};

export default function ColumnFilter({
  columnId,
  columnType,
  isOpen,
  isClosing = false,
  onClose,
  onApply,
  initialValue,
  anchorRef,
}: Props) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!isOpen || !anchorRef?.current) {
      setPosition(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2 - POPUP_WIDTH_PX / 2,
    });
  }, [isOpen, anchorRef]);

  const [condition, setCondition] = useState(
    () =>
      (initialValue && 'condition' in initialValue ? initialValue.condition : '') ||
      (columnType === 'number' ? 'gt' : columnType === 'string' ? 'contains' : '')
  );
  const [value, setValue] = useState(
    () => (initialValue && 'value' in initialValue ? initialValue.value : '') || ''
  );
  const [desde, setDesde] = useState(
    () => (initialValue && 'desde' in initialValue ? initialValue.desde : '') || ''
  );
  const [hasta, setHasta] = useState(
    () => (initialValue && 'hasta' in initialValue ? initialValue.hasta : '') || ''
  );

  const valueRef = useRef<HTMLInputElement>(null);
  const desdeRef = useRef<HTMLInputElement>(null);
  const hastaRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const startClose = () => {
    if (isExiting || isClosing) return;
    setIsExiting(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') startClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (popupRef.current?.contains(target as Node)) return;
      if (target.closest?.('[data-column-filter-trigger]')) return;
      startClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleApply = () => {
    if (columnType === 'number') {
      const v = valueRef.current?.value ?? value;
      onApply({ type: 'number', condition, value: v });
    } else if (columnType === 'string') {
      const v = valueRef.current?.value ?? value;
      onApply({ type: 'string', condition, value: v });
    } else {
      const d = desdeRef.current?.value ?? desde;
      const h = hastaRef.current?.value ?? hasta;
      onApply({ type: 'date', desde: d, hasta: h });
    }
    startClose();
  };

  const conditionOptions =
    columnType === 'number' ? NUMBER_CONDITIONS : STRING_CONDITIONS;

  const handleConditionSelect = (e: React.MouseEvent<HTMLLIElement>, ref: React.RefObject<HTMLSpanElement | null>) => {
    const key = (e.currentTarget as HTMLElement).dataset.key ?? '';
    setCondition(key);
    if (ref.current) {
      ref.current.textContent = e.currentTarget.textContent ?? '';
      ref.current.dataset.key = key;
    }
  };

  const showPopup = isOpen || isExiting;
  if (!showPopup) return null;

  const usePortal = Boolean(anchorRef && typeof document !== 'undefined');
  if (usePortal && position === null && !isClosing) return null;

  const runExitAnimation = isClosing || isExiting;
  const style: React.CSSProperties = usePortal && position
    ? { position: 'fixed', top: position.top, left: Math.max(8, Math.min(position.left, window.innerWidth - POPUP_WIDTH_PX - 8)), zIndex: 9999, width: POPUP_WIDTH_PX }
    : {};
  const positionClass = usePortal ? '' : 'absolute z-[9999] left-1/2 -translate-x-1/2 top-full mt-1';

  const popupVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.92 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] as const },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      y: -4,
      transition: {
        duration: 0.28,
        ease: [0.4, 0, 0.2, 1] as const,
        opacity: { duration: 0.28 },
      },
    },
  };

  const popupContent = (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        className={`min-h-[9em] bg-gabu-700 rounded-2xl p-3 flex flex-col shadow-xl border border-gabu-900 w-[20em] ${positionClass}`}
        style={style}
        variants={popupVariants}
        initial="hidden"
        animate={runExitAnimation ? 'exit' : 'visible'}
        onAnimationComplete={(definition) => {
          if (runExitAnimation && definition === 'exit') {
            onClose();
            setIsExiting(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-gabu-700 rotate-45 rounded-sm border-l border-t border-gabu-700" />
        <p className="text-base text-gabu-100 text-center border-b border-gabu-100/25 pb-2 mb-2">
          Filtrar campo
        </p>

        {columnType === 'date' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gabu-100 text-xs font-normal">Fecha desde</label>
              <Input
                label=""
                hasLabel={false}
                isLogin={false}
                disabled={false}
                type="date"
                ref={desdeRef}
                isError={false}
                errorMessage={null}
                defaultValue={desde}
                variant="columnFilter"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gabu-100 text-xs font-normal">Fecha hasta</label>
              <Input
                label=""
                hasLabel={false}
                isLogin={false}
                disabled={false}
                type="date"
                ref={hastaRef}
                isError={false}
                errorMessage={null}
                defaultValue={hasta}
                variant="columnFilter"
              />
            </div>
          </div>
        ) : (
          <div className="flex w-full gap-2">
            <div className="flex flex-col gap-1 w-[50%]">
              <Select
                label="Condición"
                hasLabel={true}
                isLogin={false}
                variant="filterModal"
                options={conditionOptions}
                defaultValue={condition || conditionOptions[0]?.key}
                chooseOptionHandler={handleConditionSelect}
              />
            </div>
            <div className="flex flex-col gap-1 w-[50%]">
              <Input
                label="Valor"
                hasLabel={true}
                isLogin={false}
                disabled={false}
                type={columnType === 'number' ? 'number' : 'text'}
                ref={valueRef}
                isError={false}
                errorMessage={null}
                defaultValue={value}
                variant="columnFilter"
              />
            </div>
          </div>
        )}

        <div className="w-full flex justify-center mt-4">
          <Button
            text="Aplicar"
            type="button"
            handleClick={handleApply}
            style="font-normal text-sm text-gabu-900 px-10 py-1.5 bg-gabu-300 rounded-lg hover:bg-gabu-100 cursor-pointer transition-colors duration-300"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );

  if (usePortal) {
    return createPortal(popupContent, document.body);
  }
  return popupContent;
}
