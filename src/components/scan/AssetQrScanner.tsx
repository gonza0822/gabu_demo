"use client";

import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { parseAssetQrPayload } from "@/lib/fixedAssets/assetQr";

type DetectorCtor = new (opts?: { formats: string[] }) => {
    detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

function getBarcodeDetector(): DetectorCtor | null {
    if (typeof window === "undefined") return null;
    const ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    return ctor ?? null;
}

function decodeCanvas(canvas: HTMLCanvasElement): string | null {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
    return code?.data ?? null;
}

export default function AssetQrScanner({
    onDetect,
    onClose,
}: {
    onDetect: (bienId: string) => void;
    onClose: () => void;
}): React.ReactElement {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number>(0);
    const closedRef = useRef(false);
    const onDetectRef = useRef(onDetect);
    onDetectRef.current = onDetect;
    const [error, setError] = useState<string | null>(null);
    const [usingLive, setUsingLive] = useState(false);

    function stopStream() {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }

    function acceptRaw(raw: string) {
        const parsed = parseAssetQrPayload(raw);
        if (!parsed) {
            setError("Ese código no es un QR de GABU.");
            return;
        }
        closedRef.current = true;
        stopStream();
        onDetectRef.current(parsed.bienId);
    }

    useEffect(() => {
        closedRef.current = false;
        let cancelled = false;

        async function startLive() {
            if (!navigator.mediaDevices?.getUserMedia) {
                return false;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: false,
                });
                if (cancelled || closedRef.current) {
                    stream.getTracks().forEach((track) => track.stop());
                    return false;
                }
                streamRef.current = stream;
                const video = videoRef.current;
                if (!video) return false;
                video.srcObject = stream;
                await video.play();
                setUsingLive(true);

                const Detector = getBarcodeDetector();
                const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

                const tick = async () => {
                    if (closedRef.current || cancelled) return;
                    const vid = videoRef.current;
                    const canvas = canvasRef.current;
                    if (vid && canvas && vid.readyState >= 2 && vid.videoWidth > 0) {
                        canvas.width = vid.videoWidth;
                        canvas.height = vid.videoHeight;
                        const ctx = canvas.getContext("2d", { willReadFrequently: true });
                        ctx?.drawImage(vid, 0, 0);
                        try {
                            if (detector) {
                                const codes = await detector.detect(canvas);
                                const raw = codes[0]?.rawValue;
                                if (raw) {
                                    acceptRaw(raw);
                                    return;
                                }
                            } else {
                                const raw = decodeCanvas(canvas);
                                if (raw) {
                                    acceptRaw(raw);
                                    return;
                                }
                            }
                        } catch {
                            const raw = decodeCanvas(canvas);
                            if (raw) {
                                acceptRaw(raw);
                                return;
                            }
                        }
                    }
                    rafRef.current = requestAnimationFrame(() => {
                        void tick();
                    });
                };
                rafRef.current = requestAnimationFrame(() => {
                    void tick();
                });
                return true;
            } catch {
                return false;
            }
        }

        void startLive().then((ok) => {
            if (!ok && !cancelled) {
                const insecure = typeof window !== "undefined" && !window.isSecureContext;
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                setError(
                    insecure
                        ? `Chrome bloquea la cámara en HTTP. En el celu abrí chrome://flags, buscá Insecure origins treated as secure, cargá ${origin}, Relaunch, y volvé a escanear.`
                        : "No se pudo abrir la cámara en vivo. Podés tomar una foto del QR."
                );
            }
        });

        return () => {
            cancelled = true;
            closedRef.current = true;
            stopStream();
        };
    }, []);

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setError(null);
        try {
            const bitmap = await createImageBitmap(file);
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;
            ctx.drawImage(bitmap, 0, 0);
            const Detector = getBarcodeDetector();
            if (Detector) {
                const codes = await new Detector({ formats: ["qr_code"] }).detect(canvas);
                if (codes[0]?.rawValue) {
                    acceptRaw(codes[0].rawValue);
                    return;
                }
            }
            const raw = decodeCanvas(canvas);
            if (raw) {
                acceptRaw(raw);
                return;
            }
            setError("No se leyó un QR de GABU en esa imagen.");
        } catch {
            setError("No se pudo leer la imagen.");
        }
    }

    return (
        <div className="fixed inset-0 z-[10040] flex flex-col bg-gabu-900">
            <div className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
                <p className="text-base font-semibold text-gabu-100">Escanear bien</p>
                <button
                    type="button"
                    onClick={() => {
                        closedRef.current = true;
                        stopStream();
                        onClose();
                    }}
                    className="min-h-11 rounded-xl px-3 text-sm font-medium text-gabu-100 transition-colors duration-200 hover:bg-gabu-700 cursor-pointer"
                >
                    Cancelar
                </button>
            </div>
            <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
                <video
                    ref={videoRef}
                    className={`h-full w-full object-cover ${usingLive ? "" : "hidden"}`}
                    playsInline
                    muted
                    autoPlay
                />
                {!usingLive && (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                        <p className="text-sm leading-relaxed text-gabu-300">
                            Apuntá al QR pegado en el bien. Si la cámara en vivo no está disponible, sacá una foto.
                        </p>
                    </div>
                )}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-48 w-48 rounded-2xl border-2 border-gabu-100/80" />
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {error ? <p className="px-5 pt-3 text-center text-sm text-gabu-100">{error}</p> : null}
            <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        void handleFile(e.target.files?.[0]);
                        e.target.value = "";
                    }}
                />
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="min-h-12 w-full rounded-xl bg-gabu-100 px-4 text-base font-semibold text-gabu-900 transition-colors duration-200 hover:bg-gabu-300 cursor-pointer"
                >
                    Tomar foto del QR
                </button>
            </div>
        </div>
    );
}
