import BusinessUnit from "@/lib/models/tables/BusinessUnit";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, BusinessUnit);
}