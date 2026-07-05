import { NextResponse } from "next/server";
import { getHomeDashboardCached, HomeDashboardData } from "@/lib/models/Home";
import { createRequestId, errorJson, logApiError } from "@/lib/logger";

type HomePostRequest = {
    client: string;
};

type ErrorResponse = { message: string; status: number; requestId?: string };

const ROUTE = "/api/home";

export async function POST(request: Request): Promise<NextResponse<HomeDashboardData | ErrorResponse>> {
    const requestId = createRequestId();
    let client: string | undefined;

    try {
        const body = (await request.json()) as HomePostRequest;
        client = body.client;
        if (!client) return errorJson("Client is required", 400, requestId);

        const payload = await getHomeDashboardCached(client);
        return NextResponse.json(payload);
    } catch (err) {
        const loggedId = await logApiError({ route: ROUTE, err, client, requestId });
        if (err instanceof Error) {
            return errorJson(err.message, 500, loggedId);
        }
        return errorJson("Error desconocido", 500, loggedId);
    }
}
