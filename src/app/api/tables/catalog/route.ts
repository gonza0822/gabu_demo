import Catalog from "@/lib/models/tables/Catalog";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, Catalog);
}
