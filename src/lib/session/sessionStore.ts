import { cookies } from "next/headers";

export async function getSessionValue(sessionName : string) : Promise<string | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(sessionName);
    if(sessionCookie){
        return sessionCookie.value;
    }
    return null;
}

export async function setSessionStore(sessionName : string, sessionValue : string, expiration: number) : Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set({
        name: sessionName,
        value: sessionValue,
        httpOnly: true,
        // En producción (HTTPS) la cookie va Secure. En `next dev` no: el celu entra
        // por http://192.168.x.x y Chrome descarta cookies Secure fuera de localhost.
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: expiration,
        path: '/'
    });
}

export async function deleteSessionStore(sessionName : string) : Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(sessionName);
}
