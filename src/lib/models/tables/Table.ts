import { ConverFieldModel } from "@/generated/prisma/models";

export type FieldsWithRelation = ConverFieldModel & {
    relation: {
        id: string,
        description: string | null
    }[],
    options?: {
        maxRows?: boolean,
        fixed?: boolean,
        hidden?: boolean,
        required?: boolean,
        isDate?: boolean,
        defaultValue?: string | number | boolean | null
    }
}

export type SecondaryTableFields= {
    fieldsManage: FieldsWithRelation[]
}

export type SecondaryTable<TTwo> = TTwo[];

export type AllData<TOne> = {
    table: TOne[],
    fieldsManage: FieldsWithRelation[],
    secondaryTable?: SecondaryTableFields
};

export type ReOrderData = {
    tableId : string,
    fieldId: string,
    order: number
}[]

export type Validation<T> = {
  [K in keyof T]?: {
    [V in string]: {
      [L in keyof T]?: boolean | { available: boolean; value: string }
    };  
  }
};

export type TwoTableData<TOne, TTwo> = {
    mainTableData: TOne,
    secondaryTableData: TTwo[]
}

export abstract class Table<
    TOne,        
    TOrder = ConverFieldModel[]  
> {
    client: string;

    constructor(client: string) {
        this.client = client;
    }

    abstract getAll(): Promise<AllData<TOne>>;
    abstract getOne(id: string, secId?: string): Promise<TOne | TwoTableData<TOne, unknown> | null>;
    abstract insertOne(data: TOne, secondaryData?: SecondaryTable<unknown>): Promise<TOne>;
    abstract updateOne(data: TOne, secondaryData?: SecondaryTable<unknown>): Promise<TOne>;
    abstract deleteOne(id: string, secId?: string): Promise<boolean>;
    abstract changeOrder(data: TOrder): Promise<ConverFieldModel[]>;
    abstract getValidations(): Promise<Validation<TOne>>;
}
