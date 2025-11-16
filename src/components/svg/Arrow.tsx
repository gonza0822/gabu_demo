'use client'

import { ReactElement } from "react";

export default function Arrow({size, color, hoverStyle, defaultRotation = "rotate-0", activeRotation, active} : {size: number; color: string; hoverStyle?: string; defaultRotation: string; activeRotation: string; active: boolean;}) : ReactElement {
    const style : string = `transition-transform transform origin-center fill-current ${color} transition-colors duration-150 ${hoverStyle && hoverStyle} ${!active ? defaultRotation : activeRotation}`;

    return (
        <svg width={size} height={size} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={style}>
            <path fillRule="evenodd" clipRule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
        </svg>
    );
}