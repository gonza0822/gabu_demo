'use client';

import { ReactElement, useState } from "react";
import ChartContainer from "./ChartContainer";
import Tab from "./Tab";
import useColors from "@/hooks/useColors";
import getBarChartConfig from "@/util/charts/barChart";
import { HomeTabData } from "@/lib/models/Home";

export default function ChartsContainer({ tabs, fechaProceso }: { tabs: HomeTabData[]; fechaProceso: string }): ReactElement {
    const colors = useColors();
    const [activeTab, setActiveTab] = useState<HomeTabData["id"]>("monedaLocal");

    function handleTabClick(tabId: HomeTabData["id"]) {
        setActiveTab(tabId);
    }

    const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

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
            <div className="flex h-full min-h-0 w-full overflow-x-auto overflow-y-hidden">
                <div className="flex h-full min-h-0 min-w-full">
                    {(currentTab?.charts ?? []).map((chart) => (
                        <div key={`${currentTab?.id}-${chart.title}`} className="flex-none basis-[40%] max-w-[40%] min-w-[40%] h-full">
                            <ChartContainer
                                chartFn={() =>
                                    getBarChartConfig(
                                        {
                                            values: {
                                                labels: chart.labels,
                                                data: chart.data,
                                            },
                                            yScale: chart.yScale ?? "linear",
                                        },
                                        colors.colors
                                    )
                                }
                                title={chart.title}
                                fullW={false}
                                type="bar"
                                canRender={colors.isReady}
                                compact
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}