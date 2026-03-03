import GeographicLocation from "@/lib/models/tables/GeographicLocation";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, GeographicLocation);
}