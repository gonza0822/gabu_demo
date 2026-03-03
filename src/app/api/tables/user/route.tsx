import User from "@/lib/models/tables/User";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, User );
}