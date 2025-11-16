import { ReactElement } from "react";
import { ChartData, ChartOptions } from "chart.js";

export default function Chart({type, options, data} : {type: string; options: ChartOptions; data: ChartData}) : ReactElement {
    return (
        <canvas className="absolute inset-0"></canvas>
    );
}