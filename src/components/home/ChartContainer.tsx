'use client';

import { ReactElement } from "react";
import { ChartData, ChartOptions, ChartTypeRegistry } from "chart.js";
import { Chart } from "react-chartjs-2";

export default function ChartContainer<TChart extends keyof ChartTypeRegistry, ValuesData>({chartFn, title, fullW, type, canRender} : {chartFn: () => { options: ChartOptions<TChart>, data: ChartData<TChart, ValuesData> }; title: string, fullW: boolean, type: TChart, canRender: boolean}) : ReactElement {

    const style = `home-chart-card flex flex-col mx-5 my-4 gap-3 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:mx-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:my-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1 ${fullW ? 'min-w-[95%]' : 'min-w-[40%]'}`;

    const { options, data } = chartFn();

    return (
        <div className={style}>
            <p className="home-chart-title text-base xl:text-lg 2xl:text-xl text-gabu-700 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-sm">{title}</p>
            <div className="relative flex h-full w-full">
                {canRender && <Chart type={type} options={options} data={data} className="absolute inset-0"/>}
                {!canRender && <div className="absolute inset-0 flex justify-center items-center"><p className="text-gabu-500">Cargando...</p></div>}
            </div>
        </div>
    );
};