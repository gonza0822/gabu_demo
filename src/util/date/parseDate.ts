export function parseStringDate(dateString: Date | null): string {
    if (!dateString) {
        return '';
    }
    return `${String(dateString.getUTCMonth() + 1).padStart(2, '0')}/${dateString.getUTCFullYear()}`;
}

/** MM/YYYY → 1° del mes en UTC. Local (AR) a las 00:00 corre un mes atrás al grabar en SQL. */
export function parseDateString(dateString: string): Date {
    const [month, year] = dateString.split('/');
    return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

export function parseMmYyyyToUtcDate(value: string): Date | null {
    const m = String(value || '').match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (!m) return null;
    return new Date(Date.UTC(Number(m[2]), Number(m[1]) - 1, 1));
}

/** Fecha calendario yyyy-MM-dd. Saca hora y zona de ISO (`…T00:00:00.000Z`). */
export function formatValueToYyyyMmDd(val: unknown): string {
    if (val == null || val === '') return '';
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return String(val);
        return `${val.getUTCFullYear()}-${String(val.getUTCMonth() + 1).padStart(2, '0')}-${String(val.getUTCDate()).padStart(2, '0')}`;
    }
    const t = String(val).trim();
    if (!t) return '';
    const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    return t;
}

/** Periodo MM/YYYY desde Date o ISO, sin usar getMonth() local. */
export function formatValueToMmYyyy(val: unknown): string {
    if (val == null || val === '') return '';
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return String(val);
        return parseStringDate(val);
    }
    if (typeof val === 'string') {
        const t = val.trim();
        const iso = t.match(/^(\d{4})-(\d{2})/);
        if (iso) return `${iso[2]}/${iso[1]}`;
        const mmYyyy = t.match(/^(\d{1,2})[\/\-](\d{4})$/);
        if (mmYyyy) return `${mmYyyy[1].padStart(2, '0')}/${mmYyyy[2]}`;
        const d = new Date(t);
        if (!isNaN(d.getTime())) return parseStringDate(d);
    }
    return String(val);
}