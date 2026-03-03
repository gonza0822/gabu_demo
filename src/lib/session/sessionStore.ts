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
        secure: true,
        sameSite: 'strict',
        maxAge: expiration,
        path: '/'
    });
}

export async function deleteSessionStore(sessionName : string) : Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(sessionName);
}
