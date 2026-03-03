import Account from "@/lib/models/tables/Account";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, Account);
}