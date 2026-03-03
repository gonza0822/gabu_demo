import TaxCoefficient from "@/lib/models/tables/TaxCoefficient";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, TaxCoefficient);
}