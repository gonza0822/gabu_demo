'use client';

import { ReactElement, useState } from "react";
import ChartContainer from "./ChartContainer";
import Tab from "./Tab";
import getDinamicLineChartConfig from "@/util/charts/dinamicLineChart";
import useColors from "@/hooks/useColors";
import getLineChartConfig from "@/util/charts/lineChart";
import getBarChartConfig from "@/util/charts/barChart";
import getDoughnutChartConfig from "@/util/charts/doughnutChart";
import { Reorder } from "motion/react";

export default function ChartsContainer(): ReactElement {
    const colors = useColors();
    const [activeTab, setActiveTab] = useState<string>('inversionProyectos');

    const mendozaPlantProjectChartFn = () => getDinamicLineChartConfig({
        optionsData: {
            ticks : [
                { value: 100 },
                { value: 2000 },
                { value: 3000 },
                { value: 4000 },
            ],
            min: '2025-01-01',
            max: '2025-05-30',
            unit: 'month',
        },
        values: [
            {x: '2025-01-02', y: 100},
            {x: '2025-01-25', y: 1000},
            {x: '2025-02-25', y: 700},
            {x: '2025-03-25', y: 3000},
            {x: '2025-04-25', y: 2700},
            {x: '2025-05-30', y: 4000},
        ]
    }, colors.colors);

    const mainFactoryExpansionChartFn = () => getDinamicLineChartConfig({
        optionsData: {
            ticks : [
              { value: 100 },
              { value: 2000 },
              { value: 3000 },
              { value: 4000 },
            ],
            min: '2025-01-01',
            max: '2025-05-30',
            unit: 'month',
        },
        values: [
            {x: '2025-01-02', y: 100},
            {x: '2025-01-25', y: 1000},
            {x: '2025-02-25', y: 2000},
            {x: '2025-04-01', y: 1700},
            {x: '2025-04-25', y: 1300},
            {x: '2025-05-30', y: 3000},
        ]
    }, colors.colors);

    const newFactoryProjectChartFn = () => getDinamicLineChartConfig({
        optionsData: {
            ticks : [
                { value: 100 },
                { value: 2000 },
                { value: 3000 },
                { value: 4000 },
            ],
            min: '2025-01-01',
            max: '2025-05-30',
            unit: 'month',
        },
        values: [
            {x: '2025-01-02', y: 1000},
            {x: '2025-01-25', y: 2000},
            {x: '2025-02-25', y: 2000},
            {x: '2025-04-01', y: 4000},
            {x: '2025-04-25', y: 1300},
            {x: '2025-05-30', y: 3000},
        ]
    }, colors.colors);

    const amortizationPeriodChartFn = () => getLineChartConfig({
        optionsData: {
            grid: true,
        },
        values: {
            labels: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            data: [10000,15000,22000,24000,30000,35000,60000,100000,150000,210000,300000,500000],
        }
    }, colors.colors);

    const officeComputersChartFn = () => getBarChartConfig({
        values: {
            labels: ["January", "February", "March", "April", "May", "June"],
            data: [10000, 9000, 7000, 4000, 1000, 900,],
        }
    }, colors.colors);

    const industrialMachineChartFn = () => getBarChartConfig({
        values: {
            labels: ["July", "August", "September", "October", "November", "December"],
            data: [100000, 80000, 50000, 20000, 15000, 10000],
        }
    }, colors.colors);

    const fixedAssetsChartFn = () => getDoughnutChartConfig({
        optionsData: {
            cutout: '60%',
        },
        values: {
            labels: ['Bienes en uso', 'Bienes fuera de uso', 'Bienes en mantenimiento'],
            data: [5000, 3000, 2000],
        }
    }, colors.colors);

    function handleTabClick(tabId: string) {
        setActiveTab(tabId);
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex w-full h-[10%] bg-gabu-500 rounded-t-lg px-10">
                <Tab active={activeTab === 'inversionProyectos'} title="Inversion proyectos" key="inversionProyectos" onClick={() => handleTabClick('inversionProyectos')} hasBorderRight={activeTab === 'ejercicios'}/>
                <Tab active={activeTab === 'amortizaciones'} title="Amortizaciones" key="amortizaciones" onClick={() => handleTabClick('amortizaciones')} hasBorderRight={activeTab === 'inversionProyectos'} hasBorderLeft={activeTab === 'ejercicios'}/>
                <Tab active={activeTab === 'ejercicios'} title="Ejercicio" key="ejercicios" onClick={() => handleTabClick('ejercicios')} hasBorderLeft={activeTab === 'inversionProyectos'}/>
            </div>
            <div className={`flex h-full w-full overflow-x-auto ${activeTab === 'inversionProyectos' ? '' : 'hidden'}`} id="inversion-proyectos">
                <ChartContainer chartFn={mendozaPlantProjectChartFn} title="Proyecto Planta Mendoza" fullW={false} type="line" canRender={colors.isReady}/>
                <ChartContainer chartFn={mainFactoryExpansionChartFn} title="Ampliacion Fabrica principal" fullW={false} type="line" canRender={colors.isReady}/>
                <ChartContainer chartFn={newFactoryProjectChartFn} title="Proyecto Nueva Fabrica" fullW={false} type="line" canRender={colors.isReady}/>
            </div>
            <div className={`flex h-full w-full overflow-x-auto ${activeTab === 'amortizaciones' ? '' : 'hidden'}`} id="amortizaciones">
                <ChartContainer chartFn={officeComputersChartFn} title="Computadoras de oficina" fullW={false} type="bar" canRender={colors.isReady}/>
                <ChartContainer chartFn={industrialMachineChartFn} title="Maquina industrial" fullW={false} type="bar" canRender={colors.isReady}/>
            </div>
            <div className={`flex h-full w-full overflow-x-auto ${activeTab === 'ejercicios' ? '' : 'hidden'}`} id="ejercicios">
                <ChartContainer chartFn={amortizationPeriodChartFn} title="Amortizacion acumulada ejercicio actual" fullW={true} type="line" canRender={colors.isReady}/>
            </div>
        </div>
    );
}