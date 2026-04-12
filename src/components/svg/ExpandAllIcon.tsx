import { ReactElement } from "react";

/** Doble chevron abajo: expandir todas las filas agrupadas / subtotales. */
export default function ExpandAllIcon({ style, onClick }: { style: string; onClick: () => void }): ReactElement {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={style} onClick={onClick} aria-hidden>
            <path
                d="M6 9l6 6 6-6M6 14l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
