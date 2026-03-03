export function parseStringDate(dateString: Date | null): string {
    if (!dateString) {
        return '';
    }
    return `${String(dateString.getUTCMonth() + 1).padStart(2, '0')}/${dateString.getUTCFullYear()}`;
}

export function parseDateString(dateString: string): Date {
    const [month, year] = dateString.split('/');
    return new Date(Number(year), Number(month) - 1, 1);
}