import React from "react";

export default function RemoveFilter({ style }: { style: string }): React.ReactElement {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={style}>
            <path d="M4 4H20V6.172C19.9999 6.70239 19.7891 7.21101 19.414 7.586L15 12V19L9 21V12.5L4.52 7.572C4.18545 7.20393 4.00005 6.7244 4 6.227V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 10L10 14M10 10L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    );
}
