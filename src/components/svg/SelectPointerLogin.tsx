'use client'

import { ReactElement } from "react";

export default function SelectPointerLogin({active} : {active: boolean;}) : ReactElement {
    let pointerStyle : string = 'transition-transform duration-200';

    if(!active){
        pointerStyle += ' rotate-180'
    }

    return (
        <svg width="17" height="22" viewBox="0 0 17 22" fill="none" xmlns="http://www.w3.org/2000/svg" className={pointerStyle} id='select-pointer'>
            <path d="M7.87346 17.8172C7.93807 17.9385 8.02453 18.0377 8.12538 18.1062C8.22623 18.1748 8.33846 18.2106 8.45239 18.2106C8.56633 18.2106 8.67855 18.1748 8.77941 18.1062C8.88026 18.0377 8.96671 17.9385 9.03133 17.8172L15.37 5.98081C15.4434 5.84429 15.4864 5.68438 15.4944 5.51846C15.5024 5.35255 15.4751 5.18697 15.4155 5.03972C15.3558 4.89246 15.266 4.76917 15.156 4.68323C15.0459 4.59729 14.9197 4.55199 14.7911 4.55225H2.11368C1.98539 4.55293 1.85967 4.59882 1.75004 4.68496C1.64041 4.77111 1.55102 4.89426 1.49148 5.04117C1.43194 5.18809 1.40451 5.3532 1.41214 5.51876C1.41976 5.68432 1.46215 5.84406 1.53475 5.98081L7.87346 17.8172Z" fill="#071739"/>
        </svg>
    );
}