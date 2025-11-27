import { ChartData, ChartOptions, LinearScale, TimeScale, PointElement, LineElement, BarElement, Filler, Chart, TooltipItem, CategoryScale, ArcElement } from "chart.js";

Chart.register(LinearScale, TimeScale, PointElement, LineElement, BarElement, Filler, CategoryScale, ArcElement);

type ValuesData =  {
    labels: string[];
    data: number[];
};

export default function getBarChartConfig({
    values,
} : {
    values: ValuesData,
}, colors : {
    strongBlue: string,
    mediumBlue: string,
    softBlue: string,
    blueGray: string,
    light: string,
}) : {
    options: ChartOptions<'bar'>,
    data: ChartData<'bar', ValuesData['data']>
} {
    return {
        options: {
            plugins: {
                legend: {
                display: false,
                },
                tooltip: {
                    callbacks: {
                        label: (context: TooltipItem<'bar'>) => {
                            let label = context.dataset.label || '';

                            if(context.parsed.y !== null) {
                                label = '$' + context.parsed.y;
                            }

                            return label;
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                border: {
                    color: colors.strongBlue,
                    width: 2,
                },
                grid: {
                    display: false
                },
                ticks: {
                    color: colors.strongBlue,
                    align: 'start'
                },
                },
                y: {
                border: {
                    color: colors.strongBlue,
                    width: 2,
                },
                grid: {
                    display: false
                },
                ticks: {
                    color: colors.strongBlue,
                    align: 'start',
                    callback: (value : string | number) : string => {
                        return '$' + value
                    }
                }
                }
            }
        },
        data: {
            labels: values.labels,
            datasets: [{
                data: values.data,
                backgroundColor: colors.strongBlue
            }]
        }
    }
}

