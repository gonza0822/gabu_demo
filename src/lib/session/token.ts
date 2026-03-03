import { SignJWT, jwtVerify, JWTPayload } from "jose";

type SessionPayload = JWTPayload & {
    sub: string;
    client?: string;
};

const SESSION_ALG = "HS256" as const;

function getSessionSecret(): Uint8Array {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error("SESSION_SECRET no esta configurado.");
    }
    return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload, expiresInSeconds = 60 * 60 * 24): Promise<string> {
    const secret = getSessionSecret();

    return await new SignJWT(payload)
        .setProtectedHeader({ alg: SESSION_ALG })
        .setIssuedAt()
        .setExpirationTime(`${expiresInSeconds}s`)
        .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const secret = getSessionSecret();
        const { payload } = await jwtVerify(token, secret);
        return payload as SessionPayload;
    } catch {
        return null;
    }
}
