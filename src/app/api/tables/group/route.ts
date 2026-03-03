import Group from "@/lib/models/tables/Group";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, Group);
}