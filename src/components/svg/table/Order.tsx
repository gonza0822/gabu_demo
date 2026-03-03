import React from "react";

export default function Order({style, onClick} : {style: string, onClick?: React.MouseEventHandler<SVGSVGElement>}) : React.ReactElement  {
    return (
        <svg viewBox="0 0 8 15" fill="none" xmlns="http://www.w3.org/2000/svg" className={style} onClick={onClick}>
            <path d="M6.82832 9.83333L3.72471 12.75L0.621094 9.83333L1.17199 9.31563L3.72471 11.7146L6.27743 9.31563L6.82832 9.83333Z" fill="#1C3551"/>
            <g clipPath="url(#clip0_402_709)">
                <path d="M0.620899 5.16667L3.72451 2.25L6.82812 5.16667L6.27723 5.68437L3.72451 3.28542L1.17179 5.68437L0.620899 5.16667Z" fill="#1C3551"/>
            </g>
            <defs>
                <clipPath id="clip0_402_709">
                    <rect width="7" height="7.44867" fill="white" transform="matrix(0 1 -1 0 7.44922 0.5)"/>
                </clipPath>
            </defs>
        </svg>
    );
}