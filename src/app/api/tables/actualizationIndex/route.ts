import ActualizationIndex from "@/lib/models/tables/ActualizationIndex";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, ActualizationIndex);
}