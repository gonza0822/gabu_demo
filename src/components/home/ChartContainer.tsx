'use client';

import { ReactElement } from "react";
import { ChartData, ChartOptions, ChartTypeRegistry } from "chart.js";
import { Chart } from "react-chartjs-2";

export default function ChartContainer<TChart extends keyof ChartTypeRegistry, ValuesData>({
    chartFn,
    title,
    fullW,
    type,
    canRender,
    compact = false,
} : {
    chartFn: () => { options: ChartOptions<TChart>, data: ChartData<TChart, ValuesData> };
    title: string,
    fullW: boolean,
    type: TChart,
    canRender: boolean,
    compact?: boolean
}) : ReactElement {

    const style = compact
        ? "home-chart-card flex flex-col w-full h-full min-w-0 px-2 py-1.5 gap-1 sm:px-3 sm:py-2 sm:gap-2 [@media(max-height:600px)]:px-1.5 [@media(max-height:600px)]:py-1 [@media(max-height:600px)]:gap-1"
        : `home-chart-card flex flex-col mx-5 my-4 gap-3 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:mx-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:my-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1 ${fullW ? 'min-w-[95%]' : 'min-w-[40%]'}`;

    const { options, data } = chartFn();

    return (
        <div className={style}>
            <p className="home-chart-title shrink-0 line-clamp-2 text-xs sm:text-sm xl:text-base 2xl:text-lg text-gabu-700 [@media(max-height:600px)]:text-[11px] [@media(max-height:600px)]:leading-tight [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-sm">{title}</p>
            <div className="relative flex h-full w-full">
                {canRender && <Chart type={type} options={options} data={data} className="absolute inset-0"/>}
                {!canRender && <div className="absolute inset-0 flex justify-center items-center"><p className="text-gabu-500">Cargando...</p></div>}
            </div>
        </div>
    );
};