import { NextResponse } from "next/server";
import { Table, AllData, Validation, TwoTableData } from "@/lib/models/tables/Table";
import { ConverFieldModel } from "@/generated/prisma/models";

export type ErrorResponse = { message: string, status: number }

export async function handlePost<
    TOne,
    TAll,
    TOrder,
    TModel extends Table<TOne, TOrder>
>(
    request: Request,
    Model: new (client: string) => TModel
): Promise<NextResponse<TOne | TAll | ConverFieldModel[] | AllData<TOne> | Validation<TOne> | boolean | TwoTableData<TOne, unknown> | ErrorResponse >> {

    type UserPostRequest = | { petition: "Get"; client: string; data: {} } | { petition: "GetOne"; client: string; data: { id: string } } | { petition: "UpdateOne"; client: string; data: TwoTableData<TOne, unknown> } | { petition: "UpdateOrder"; client: string; data: TOrder } | { petition: "Insert"; client: string; data: TwoTableData<TOne, unknown>; } | { petition: "getValidations"; client: string; data: TOne } | { petition: "DeleteOne"; client: string; data: { id: string, secId?: string } };

    try {
        
        const { client, petition, data } = await request.json() as UserPostRequest;
        const model = new Model(client);
        
        switch (petition) {
            case "Get":
                return NextResponse.json(await model.getAll());

            case "GetOne":
                const one = await model.getOne(data.id);
                if (!one) throw new Error("Elemento no encontrado");
                return NextResponse.json(one);

            case "Insert":
                return NextResponse.json(await model.insertOne(data.mainTableData, data.secondaryTableData));

            case "UpdateOne":
                return NextResponse.json(await model.updateOne(data.mainTableData, data.secondaryTableData));

            case "UpdateOrder":
                return NextResponse.json(await model.changeOrder(data));

            case "DeleteOne":
                return NextResponse.json(await model.deleteOne(data.id, data.secId));
            
            case "getValidations":
                return NextResponse.json(await model.getValidations());

            default:
                throw new Error("Petición desconocida");
        }

    } catch (err) {
        if (err instanceof Error) {
            console.log(err);
            return NextResponse.json({ message: err.message, status: 500 });
        }
        return NextResponse.json({ message: "Error desconocido", status: 500 });
    }
}
