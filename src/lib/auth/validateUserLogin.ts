import apiValidationUser from "@/config/apiValidationUser.json";

type ApiLoginResponse = {
    token: string;
    expiracion: string;
};

export type ValidateUserLoginErrorReason =
    | "connection_error"
    | "invalid_credentials"
    | "invalid_response";

export type ValidateUserLoginResult =
    | { ok: true; token: string; expiracion: string }
    | { ok: false; reason: ValidateUserLoginErrorReason };

function resolveLoginUrl(loginUrl: string): string {
    try {
        const url = new URL(loginUrl);
        if (url.hostname === "localhost") {
            url.hostname = "127.0.0.1";
        }
        return url.toString();
    } catch {
        return loginUrl;
    }
}

function parseApiLoginResponse(raw: string): ApiLoginResponse | null {
    try {
        const data = JSON.parse(raw) as Record<string, unknown>;
        const token = data.token ?? data.Token;
        const expiracion = data.expiracion ?? data.Expiracion;

        if (typeof token !== "string" || typeof expiracion !== "string") {
            return null;
        }

        if (!token.trim() || !expiracion.trim()) {
            return null;
        }

        return { token, expiracion };
    } catch {
        return null;
    }
}

export function getLoginExpirationSeconds(expiracion: string): number {
    const expiresAt = new Date(expiracion).getTime();

    if (Number.isNaN(expiresAt)) {
        return 0;
    }

    const seconds = Math.floor((expiresAt - Date.now()) / 1000);
    return Math.max(seconds, 0);
}

export async function validateUserLogin(
    userName: string,
    password: string
): Promise<ValidateUserLoginResult> {
    let response: Response;

    try {
        response = await fetch(resolveLoginUrl(apiValidationUser.loginUrl), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ userName, password }),
        });
    } catch {
        return { ok: false, reason: "connection_error" };
    }

    const raw = await response.text();

    if (!response.ok) {
        return { ok: false, reason: "invalid_credentials" };
    }

    const data = parseApiLoginResponse(raw);

    if (!data) {
        return { ok: false, reason: "invalid_response" };
    }

    return {
        ok: true,
        token: data.token,
        expiracion: data.expiracion,
    };
}
