import {
    ChartData,
    ChartOptions,
    LinearScale,
    LogarithmicScale,
    TimeScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    Chart,
    TooltipItem,
    CategoryScale,
    ArcElement,
} from "chart.js";

Chart.register(
    LinearScale,
    LogarithmicScale,
    TimeScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    CategoryScale,
    ArcElement
);

type ValuesData = {
    labels: string[];
    data: number[];
};

function formatMoneyTick(value: string | number): string {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "";
    const abs = Math.abs(n);
    if (abs >= 1e9) return "$" + (n / 1e9).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "B";
    if (abs >= 1e6) return "$" + (n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "M";
    if (abs >= 1e3) return "$" + (n / 1e3).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "k";
    return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function formatMoneyTooltip(value: number): string {
    return (
        "$" +
        value.toLocaleString("es-AR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        })
    );
}

/** Evita el solapamiento del eje log: Chart.js pone 1,2,3,5,7,10 por década; dejamos solo 10^n. */
function afterBuildLogTicksOnlyPowersOfTen(scale: {
    min: number;
    max: number;
    ticks: { value: number; major?: boolean }[];
}) {
    const minV = scale.min;
    const maxV = scale.max;
    if (!Number.isFinite(minV) || !Number.isFinite(maxV) || minV <= 0 || maxV <= 0) return;

    const minExp = Math.floor(Math.log10(minV));
    const maxExp = Math.ceil(Math.log10(maxV));
    const ticks: { value: number; major: boolean }[] = [];
    for (let e = minExp; e <= maxExp; e++) {
        ticks.push({ value: 10 ** e, major: true });
    }
    if (ticks.length === 0) return;
    scale.ticks = ticks;
}

export default function getBarChartConfig(
    {
        values,
        yScale = "linear",
    }: {
        values: ValuesData;
        yScale?: "linear" | "log";
    },
    colors: {
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
                        label: (context: TooltipItem<"bar">) => {
                            const y = context.parsed.y;
                            if (y == null) return "";
                            return formatMoneyTooltip(Number(y));
                        },
                    },
                },
            },
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: yScale === "log" ? { top: 2, bottom: 2, left: 8, right: 4 } : { top: 2, bottom: 2 },
            },
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
                    align: 'start',
                    font: { size: 9, weight: 'normal' },
                    maxRotation: 28,
                    minRotation: 0,
                    autoSkip: false,
                },
                },
                y:
                    yScale === "log"
                        ? {
                              type: "logarithmic",
                              afterBuildTicks: (scale) =>
                                  afterBuildLogTicksOnlyPowersOfTen(
                                      scale as { min: number; max: number; ticks: { value: number; major?: boolean }[] }
                                  ),
                              border: {
                                  color: colors.strongBlue,
                                  width: 2,
                              },
                              grid: {
                                  display: false,
                              },
                              ticks: {
                                  color: colors.strongBlue,
                                  align: "start",
                                  font: { size: 8, weight: "normal" },
                                  maxRotation: 0,
                                  autoSkip: true,
                                  maxTicksLimit: 12,
                                  callback: (value: string | number) => formatMoneyTick(value),
                              },
                          }
                        : {
                              border: {
                                  color: colors.strongBlue,
                                  width: 2,
                              },
                              grid: {
                                  display: false,
                              },
                              ticks: {
                                  color: colors.strongBlue,
                                  align: "start",
                                  font: { size: 10, weight: "normal" },
                                  callback: (value: string | number) => formatMoneyTick(value),
                              },
                          },
            },
        },
        data: {
            labels: values.labels,
            datasets: [
                {
                    data: values.data,
                    backgroundColor: colors.strongBlue,
                    ...(yScale === "log" ? {} : { minBarLength: 2 }),
                },
            ],
        },
    };
}

