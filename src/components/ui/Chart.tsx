import { ReactElement } from "react";

export default function Chart<TOptions = any, TData = any>({type, options, data} : {type: string; options: TOptions; data: TData}) : ReactElement {
    return (
        <canvas className="absolute inset-0"></canvas>
    );
}