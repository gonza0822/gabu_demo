import Procedence from "@/lib/models/tables/Procendece";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, Procedence);
}