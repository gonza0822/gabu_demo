'use client';

import { ReactElement } from "react";
import { Chart } from "react-chartjs-2";
import getDoughnutChartConfig from "@/util/charts/doughnutChart";
import useColors from "@/hooks/useColors";
import { HomeStats } from "@/lib/models/Home";

export default function DoughnutContainer({ stats }: { stats: HomeStats }) : ReactElement {

    const colors = useColors();

    const { options, data } = getDoughnutChartConfig({
        optionsData: {
            cutout: "58%",
        },
        values: {
            labels: ['Total de bienes', 'Altas del ejercicio', 'Bajas en el ejercicio'],
            data: [stats.totalBienes, stats.altasEjercicio, stats.bajasEjercicio],
        }
    }, colors.colors);

    return (
        <div className="flex flex-col h-full min-h-0 min-w-0">
            <div className="w-full justify-start px-5 2xl:px-12 pt-3 2xl:pt-7 [@media(max-height:600px)]:px-3 [@media(max-height:600px)]:pt-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-3 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:pt-2">
                <p className="home-doughnut-title text-xl xl:text-2xl 2xl:text-3xl text-gabu-900 font-medium [@media(max-height:600px)]:text-lg [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-lg">Uso de bienes</p>
            </div>
            <div className="home-doughnut-layout flex gap-4 xl:gap-6 2xl:gap-8 2xl:px-10 h-full min-h-0 min-w-0 justify-center items-center px-3 pb-2 xl:px-8 [@media(max-height:600px)]:gap-2 [@media(max-height:600px)]:px-2.5 [@media(max-height:600px)]:pb-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-2.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-2.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:pb-1">
                <div className="home-doughnut-chart relative flex h-full min-h-0 min-w-0 flex-1 basis-0 items-center justify-center">
                    <div className="home-doughnut-chart-inner relative z-10 aspect-square h-full max-h-[min(100%,14rem)] w-auto max-w-full xl:max-h-[min(100%,17.5rem)] 2xl:max-h-[min(100%,21rem)] [@media(max-height:600px)]:max-h-[min(100%,12rem)]">
                        {colors.isReady && <Chart type={"doughnut"} options={options} data={data} />}
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[18%] py-[12%] xl:px-[20%] [@media(max-height:600px)]:px-[16%] [@media(max-height:600px)]:py-[10%]">
                            <div className="w-full max-w-[12rem] text-center leading-tight xl:max-w-[13rem]">
                                <p className="text-gabu-900 text-[10px] font-medium tracking-tight sm:text-[11px] xl:text-xs [@media(max-height:600px)]:text-[10px]">
                                    Total bienes
                                </p>
                                <p className="text-gabu-900 mt-0.5 text-xs font-semibold tabular-nums sm:text-sm xl:text-base 2xl:text-lg [@media(max-height:600px)]:text-xs">
                                    {stats.totalBienes.toLocaleString("es-AR")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="home-doughnut-legend flex shrink-0 flex-col gap-5 2xl:gap-10 justify-center [@media(max-height:600px)]:gap-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-2">
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-900 [@media(max-height:600px)]:h-2 [@media(max-height:600px)]:w-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-2"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium [@media(max-height:600px)]:text-[11px] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">Total de bienes</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-300 [@media(max-height:600px)]:h-2 [@media(max-height:600px)]:w-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-2"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium [@media(max-height:600px)]:text-[11px] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">Altas del ejercicio</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-500 [@media(max-height:600px)]:h-2 [@media(max-height:600px)]:w-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-2"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium [@media(max-height:600px)]:text-[11px] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">Bajas en el ejercicio</p>
                    </div>
                </div>
            </div>
        </div>
    );
};