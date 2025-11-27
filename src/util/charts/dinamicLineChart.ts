import { ChartData, ChartOptions, ScriptableContext, LinearScale, TimeScale, PointElement, LineElement, CategoryScale, Filler, Chart, ArcElement } from "chart.js";
import 'chartjs-adapter-date-fns';

Chart.register(LinearScale, TimeScale, PointElement, LineElement, Filler, CategoryScale, ArcElement);

type OptionsData = {
    ticks: { value: number }[];
    min: string;
    max: string;
    unit: 'month' | 'day' | 'year';
};

type ValuesData =  {
    x: string;
    y: number;
}[];

type ChartType = 'line';

export default function getDinamicLineChartConfig({
    optionsData,
    values,
} : {
    optionsData: OptionsData,
    values: ValuesData,
}, colors : {
    strongBlue: string,
    mediumBlue: string,
    softBlue: string,
    blueGray: string,
    light: string,
}) : {
    options: ChartOptions<'line'>,
    data: ChartData<'line', ValuesData>
} {

    return {
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                display: false
                }
            },
            scales: {
                y: {
                    border: {
                        color: colors.strongBlue,
                        width: 2,
                    },
                    type: 'linear',
                    ticks: {
                        color: colors.strongBlue,
                        font: {
                            size: 11,
                        }
                    },
                    afterBuildTicks: function(scale : {
                        ticks : {value : number}[]
                    }) {
                        scale.ticks = optionsData.ticks;
                    },
                    grid: {
                        display: false
                    }
                },
                x: {
                    border: {
                        color: colors.strongBlue,
                        width: 2,
                    },
                    type: 'time',
                    time: {
                        unit: optionsData.unit,
                    },
                    min: optionsData.min,
                    max: optionsData.max,
                    ticks: {
                        color: colors.strongBlue,
                        align: 'start',
                        font: {
                            size: 11,
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        },
        data: {
            datasets: [{
                data: values as ValuesData,
                borderColor: colors.strongBlue,
                borderWidth: 0,
                fill: true,
                tension: 0.4,
                backgroundColor: (context : ScriptableContext<ChartType>) => {
                    const {ctx, chartArea} = context.chart;

                    if(!chartArea){
                        return undefined;
                    }

                    const chartGradient = ctx.createLinearGradient(0, 0, 0, chartArea.bottom);
                    chartGradient.addColorStop(0.5, colors.strongBlue);
                    chartGradient.addColorStop(1, colors.light);
                    return chartGradient;
                },
                pointRadius: 0,
                pointHoverRadius: 0
            }]
        },
    }
}