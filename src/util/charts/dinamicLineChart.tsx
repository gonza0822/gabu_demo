import colors from "../colors";

export default function getLineChartConfig() {
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
                    afterBuildTicks: function(scale : {
                        ticks : {value : number}[]
                    }) {
                        scale.ticks = [
                        { value: 100 },
                        { value: 2000 },
                        { value: 3000 },
                        { value: 4000 },
                        ];
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
                        unit: 'month',
                    },
                    min: '2025-01-01',
                    max: '2025-05-30',
                    ticks: {
                        color: colors.strongBlue,
                        align: 'start'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        },
        data: {
            datasets: [{
            data: [
                {x: '2025-01-02', y: 100},
                {x: '2025-01-25', y: 1000},
                {x: '2025-02-25', y: 700},
                {x: '2025-03-25', y: 3000},
                {x: '2025-04-25', y: 2700},
                {x: '2025-05-30', y: 4000},
            ],
            borderColor: colors.strongBlue,
            borderWidth: 0,
            fill: true,
            tension: 0.4,
            /* backgroundColor: (context : any) => {
                const {ctx, chartArea} = context.chart;

                if(!chartArea){
                return null
                }

                const chartGradient = ctx.createLinearGradient(0, 0, 0, chartArea.bottom);
                chartGradient.addColorStop(0.5, colors.strongBlue);
                chartGradient.addColorStop(1, colors.light);
                return chartGradient;
            }, */
            pointRadius: 0,
            pointHoverRadius: 0
            }]
        },
    }
}