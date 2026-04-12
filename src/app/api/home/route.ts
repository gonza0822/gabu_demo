import { NextResponse } from "next/server";
import Home, { HomeDashboardData } from "@/lib/models/Home";

type HomePostRequest = {
    client: string;
};

type ErrorResponse = { message: string; status: number };

export async function POST(request: Request): Promise<NextResponse<HomeDashboardData | ErrorResponse>> {
    try {
        const { client } = (await request.json()) as HomePostRequest;
        if (!client) return NextResponse.json({ message: "Client is required", status: 400 }, { status: 400 });

        const model = new Home(client);
        const payload = await model.getDashboard();
        return NextResponse.json(payload);
    } catch (err) {
        if (err instanceof Error) {
            console.error(err);
            return NextResponse.json({ message: err.message, status: 500 }, { status: 500 });
        }
        return NextResponse.json({ message: "Error desconocido", status: 500 }, { status: 500 });
    }
}
