import { ChartData, ChartOptions, LinearScale, TimeScale, PointElement, LineElement, Filler, Chart, CategoryScale, ArcElement } from "chart.js";

Chart.register(LinearScale, TimeScale, PointElement, LineElement, Filler, CategoryScale, ArcElement);

type OptionsData = {
    grid: boolean;
};

type ValuesData =  {
    labels: string[];
    data: number[];
};

export default function getLineChartConfig({
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
    data: ChartData<'line', ValuesData['data']>
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
                },
                grid: {
                    display: true,
                    color: colors.blueGray
                }
                },
                x: {
                border: {
                    color: colors.strongBlue,
                    width: 2,
                },
                ticks: {
                    color: colors.strongBlue,
                    align: 'center'
                },
                grid: {
                    display: optionsData.grid,
                    color: colors.blueGray
                }
                }
            }
            },
        data: {
            labels: values.labels,
            datasets: [{
            data: values.data,
            borderColor: colors.strongBlue,
            borderWidth: 4,
            tension: 0.4,
            }]
        }
    }
}

