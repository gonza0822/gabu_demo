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
        <div className="flex flex-col h-full">
            <div className="w-full justify-start px-5 2xl:px-12 pt-3 2xl:pt-7">
                <p className="text-xl xl:text-2xl 2xl:text-3xl text-gabu-900 font-medium">Uso de bienes</p>
            </div>
            <div className="flex gap-5 xl:gap-8 2xl:gap-10 2xl:px-12 h-full justify-center pb-2">
                <div className="relative flex justify-center items-center h-full w-[40%] 2xl:w-auto">
                    <div className="z-10 h-[60%] xl:h-[80%]">
                        {colors.isReady && <Chart type={"doughnut"} options={options} data={data}/>}
                    </div>
                    <div className="absolute bg-gabu-100 flex flex-col justify-center items-center">
                    <p className="text-gabu-900 text-sm xl:text-base font-medium">Total bienes</p>
                    <p className="text-gabu-900 text-xl 2xl:text-3xl font-semibold">14392</p>
                    </div>
                </div>
                <div className="flex flex-col gap-5 2xl:gap-10 justify-center">
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-900"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium">Bienes en uso</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-300"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium">Bienes fuera en uso</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="h-3 w-3 bg-gabu-500"></span>
                        <p className="text-gabu-900 text-xs xl:text-base font-medium">Bienes en mantenimiento</p>
                    </div>
                </div>
            </div>
        </div>
    );
};