import MeasurementUnit from "@/lib/models/tables/MeasurementUnit";
import { handlePost } from "@/lib/tables/post";

export async function POST(req: Request) {
    return handlePost(req, MeasurementUnit);
}