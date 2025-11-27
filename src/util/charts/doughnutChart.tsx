import { ChartData, ChartOptions, LinearScale, TimeScale, PointElement, LineElement, Filler, Chart, CategoryScale, ArcElement, DoughnutController, Tooltip } from "chart.js";

Chart.register(LinearScale, TimeScale, PointElement, LineElement, Filler, CategoryScale, ArcElement, DoughnutController, Tooltip);

type OptionsData = {
    cutout: string;
};

type ValuesData =  {
    labels: string[];
    data: number[];
};

export default function getDoughnutChartConfig({
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
    options: ChartOptions<'doughnut'>,
    data: ChartData<'doughnut', ValuesData['data']>
} {
    return {
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: optionsData.cutout,
            plugins: {
                legend: {
                    display: false
                }
            }
        },
        data: {
            labels: values.labels,
            datasets: [{
            data: values.data,
            backgroundColor: [colors.strongBlue, colors.blueGray, colors.softBlue],
            borderWidth: 0,
            hoverBackgroundColor: [colors.strongBlue, colors.blueGray, colors.softBlue],
            }]
        }
    }
}

