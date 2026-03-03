import CostCenter from "@/lib/models/tables/CostCenter";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, CostCenter);
}