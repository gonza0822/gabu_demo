import QRCode from "qrcode";
import { buildAssetQrPayload } from "@/lib/fixedAssets/assetQr";

export type AssetQrPrintItem = {
    bienId: string;
    descripcion?: string;
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Genera las etiquetas al vuelo (mismo payload GABU-BIEN:v1) y abre la impresión. */
export async function printAssetQrStickers(items: AssetQrPrintItem[]): Promise<void> {
    const unique: AssetQrPrintItem[] = [];
    const seen = new Set<string>();
    for (const item of items) {
        const bienId = item.bienId.trim();
        if (!bienId || seen.has(bienId)) continue;
        seen.add(bienId);
        unique.push({ bienId, descripcion: item.descripcion });
    }
    if (unique.length === 0) {
        throw new Error("No hay bienes válidos para imprimir.");
    }

    const stickers: { bienId: string; descripcion: string; dataUrl: string }[] = [];
    for (const item of unique) {
        try {
            const payload = buildAssetQrPayload(item.bienId);
            const dataUrl = await QRCode.toDataURL(payload, {
                margin: 1,
                width: 320,
                errorCorrectionLevel: "M",
            });
            stickers.push({
                bienId: item.bienId,
                descripcion: (item.descripcion ?? "").trim(),
                dataUrl,
            });
        } catch {
            // id inválido: se omite y se sigue con el resto
        }
    }
    if (stickers.length === 0) {
        throw new Error("No se pudo generar ningún código QR.");
    }

    const win = window.open("", "_blank");
    if (!win) {
        throw new Error("El navegador bloqueó la ventana de impresión.");
    }

    const body = stickers
        .map((sticker) => {
            const title = escapeHtml(sticker.bienId);
            const desc = escapeHtml(sticker.descripcion);
            return `<section class="sticker">
  <p>GABU</p>
  <img src="${sticker.dataUrl}" alt="Código QR del bien ${title}" />
  <p class="id">${title}</p>
  ${desc ? `<p class="desc">${desc}</p>` : ""}
</section>`;
        })
        .join("");

    const titleText =
        stickers.length === 1 ? `QR ${escapeHtml(stickers[0].bienId)}` : "QR bienes";

    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${titleText}</title>
  <style>
    body { font-family: Rubik, Arial, sans-serif; color: #1a1a1a; margin: 0; }
    .sticker { text-align: center; padding: 32px; page-break-after: always; }
    .sticker:last-child { page-break-after: auto; }
    img { width: 280px; height: 280px; }
    p { margin: 8px 0; }
    .id { font-size: 16px; font-weight: 600; }
    .desc { font-size: 14px; max-width: 320px; margin: 8px auto 0; }
  </style>
</head>
<body>
${body}
<script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
    win.document.close();
}
