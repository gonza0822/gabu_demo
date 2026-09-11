'use client';

import { ReactElement, useState } from "react";
import ChartContainer from "./ChartContainer";
import Tab from "./Tab";
import useColors from "@/hooks/useColors";
import getBarChartConfig from "@/util/charts/barChart";
import { HomeTabData } from "@/lib/models/Home";
import { formatNumberEs } from "@/util/number/formatNumberEs";

function formatMoney(value: number): string {
    return formatNumberEs(value, 2, 2);
}

export default function ChartsContainer({ tabs, fechaProceso }: { tabs: HomeTabData[]; fechaProceso: string }): ReactElement {
    const colors = useColors();
    const [activeTab, setActiveTab] = useState<HomeTabData["id"]>("monedaLocal");

    function handleTabClick(tabId: HomeTabData["id"]) {
        setActiveTab(tabId);
    }

    const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
    const comparison = currentTab?.comparison;
    const details = currentTab?.details ?? [];

    return (
        <div className="flex flex-col h-full min-h-0 min-w-0 w-full">
            <div className="home-charts-tabs flex w-full shrink-0 h-[10%] min-h-9 bg-gabu-500 rounded-t-lg px-10 [@media(max-height:600px)]:min-h-8 [@media(max-height:600px)]:px-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:min-h-8 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-2">
                {tabs.map((tab, idx) => (
                    <Tab
                        key={tab.id}
                        active={activeTab === tab.id}
                        title={tab.title}
                        onClick={() => handleTabClick(tab.id)}
                        hasBorderLeft={idx > 0 && activeTab !== tabs[idx - 1]?.id}
                        hasBorderRight={idx < tabs.length - 1 && activeTab !== tabs[idx + 1]?.id}
                    />
                ))}
                <div className="ml-auto flex items-center text-gabu-100 text-[11px] xl:text-xs 2xl:text-sm whitespace-nowrap">
                    Fecha de proceso: {fechaProceso}
                </div>
            </div>
            <div className="flex h-full min-h-0 w-full min-w-0 gap-2 px-2 pb-2 pt-1 [@media(max-height:600px)]:gap-1 [@media(max-height:600px)]:px-1">
                <div className="flex h-full min-h-0 min-w-0 flex-[1.1]">
                    {comparison ? (
                        <ChartContainer
                            chartFn={() =>
                                getBarChartConfig(
                                    {
                                        values: {
                                            labels: comparison.labels,
                                            data: comparison.data,
                                        },
                                        yScale: "linear",
                                    },
                                    colors.colors
                                )
                            }
                            title={comparison.title}
                            fullW={false}
                            type="bar"
                            canRender={colors.isReady && comparison.labels.length > 0}
                            compact
                        />
                    ) : null}
                </div>
                <div className="home-chart-card flex h-full min-h-0 min-w-0 flex-1 flex-col px-2 py-1.5 sm:px-3 sm:py-2 [@media(max-height:600px)]:px-1.5 [@media(max-height:600px)]:py-1">
                    <div className="flex min-h-0 flex-1 items-center justify-center">
                        <div className="table-container flex h-[80%] w-[90%] flex-col border border-gabu-900 bg-gabu-100 p-2">
                            <table className="h-full w-full table-fixed border-collapse divide-y-2 divide-gabu-900/25">
                                <thead>
                                    <tr>
                                        <th className="w-[28%] text-start py-2 px-2 text-xs font-semibold text-gabu-900 whitespace-nowrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">
                                            Concepto
                                        </th>
                                        <th className="w-[24%] text-start py-2 px-2 text-xs font-semibold text-gabu-900 whitespace-nowrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">
                                            Todos
                                        </th>
                                        <th className="w-[24%] text-start py-2 px-2 text-xs font-semibold text-gabu-900 whitespace-nowrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">
                                            Altas ejercicio
                                        </th>
                                        <th className="w-[24%] text-start py-2 px-2 text-xs font-semibold text-gabu-900 whitespace-nowrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">
                                            Bajas ejercicio
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-gabu-900/25">
                                    {details.map((row) => (
                                        <tr key={row.title} className="h-1/4">
                                            <td className="py-2 px-2 text-xs text-gabu-900 whitespace-nowrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">
                                                {row.title}
                                            </td>
                                            <td className="py-2 px-2 text-xs text-end tabular-nums text-gabu-900 whitespace-nowrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">
                                                {formatMoney(row.todos)}
                                            </td>
                                            <td className="py-2 px-2 text-xs text-end tabular-nums text-gabu-900 whitespace-nowrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">
                                                {formatMoney(row.altasEjercicio)}
                                            </td>
                                            <td className="py-2 px-2 text-xs text-end tabular-nums text-gabu-900 whitespace-nowrap [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px]">
                                                {formatMoney(row.bajasEjercicio)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
