'use client';

import { useState, useEffect } from "react";

export default function useColors() : {
    colors: {
        strongBlue: string,
        mediumBlue: string,
        softBlue: string,
        blueGray: string,
        light: string,
    },
    isReady: boolean
} {
    const [colors, setColors] = useState<{
        colors: {
            strongBlue: string,
            mediumBlue: string,
            softBlue: string,
            blueGray: string,
            light: string,
        },
        isReady: boolean
    }>( {
        colors: {
            strongBlue : '',
            mediumBlue : '',
            softBlue : '',
            blueGray : '',
            light : '',
        },
        isReady: false
    });

    useEffect(() => {
        setColors({
            colors: {
                strongBlue : getComputedStyle(document.body).getPropertyValue("--color-gabu-900").trim(),
                mediumBlue : getComputedStyle(document.body).getPropertyValue("--color-gabu-700").trim(),
                softBlue : getComputedStyle(document.body).getPropertyValue("--color-gabu-500").trim(),
                blueGray : getComputedStyle(document.body).getPropertyValue("--color-gabu-300").trim(),
                light : getComputedStyle(document.body).getPropertyValue("--color-gabu-100").trim()
            },
            isReady: true
        });
    }, []);

    return colors;
}