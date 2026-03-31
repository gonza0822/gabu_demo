'use client';

import { ReactElement } from "react";
import { Chart } from "react-chartjs-2";
import getDoughnutChartConfig from "@/util/charts/doughnutChart";
import useColors from "@/hooks/useColors";

export default function DoughnutContainer() : ReactElement {

    const colors = useColors();

    const {options, data} =  getDoughnutChartConfig({
        optionsData: {
            cutout: '60%',
        },
        values: {
            labels: ['Bienes en uso', 'Bienes fuera de uso', 'Bienes en mantenimiento'],
            data: [5000, 3000, 2000],
        }
    }, colors.colors);

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="w-full justify-start px-5 2xl:px-12 pt-3 2xl:pt-7 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-3 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:pt-2">
                <p className="home-doughnut-title text-xl xl:text-2xl 2xl:text-3xl text-gabu-900 font-medium [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-lg">Uso de bienes</p>
            </div>
            <div className="home-doughnut-layout flex gap-5 xl:gap-8 2xl:gap-10 2xl:px-12 h-full min-h-0 justify-center pb-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-2.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-2.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:pb-1">
                <div className="home-doughnut-chart relative flex justify-center items-center h-full w-[40%] 2xl:w-auto [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-[42%]">
                    <div className="home-doughnut-chart-inner z-10 h-[60%] xl:h-[80%] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-[66%]">
                        {colors.isReady && <Chart type={"doughnut"} options={options} data={data}/>}
                    </div>
                    <div className="absolute bg-gabu-100 flex flex-col justify-center items-center">
                    <p className="text-gabu-900 text-sm xl:text-base font-medium [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-xs">Total bienes</p>
                    <p className="text-gabu-900 text-xl 2xl:text-3xl font-semibold [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-xl">14392</p>
                    </div>
                </div>
                <div className="home-doughnut-legend flex flex-col gap-5 2xl:gap-10 justify-center [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-2">
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-900 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-2"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">Bienes en uso</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-300 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-2"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">Bienes fuera en uso</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-500 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:h-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-2"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">Bienes en mantenimiento</p>
                    </div>
                </div>
            </div>
        </div>
    );
};