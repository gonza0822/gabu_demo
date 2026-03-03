import Plant from "@/lib/models/tables/Plant";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, Plant);
}