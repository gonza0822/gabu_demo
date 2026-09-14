'use client';

import './styles.css';
import { ReactElement, useMemo } from 'react';
import ChartsContainer from '@/components/home/ChartsContainer';
import DoughnutContainer from '@/components/home/DoughnutContainer';
import StadisticSection from '@/components/home/StadisticSection';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useFetch } from '@/hooks/useFetch';
import { HomeDashboardData } from '@/lib/models/Home';
import { getHomeDashboardFromCache, setHomeDashboardInCache } from '@/lib/cache/homeDashboardCache';
import { syncWorkspacePath } from '@/util/navigation/syncWorkspacePath';

export default function Home() : ReactElement {
    const router = useRouter();
    const client = useSelector((state: RootState) => state.authorization.client);

    function openAdministrar(filtro?: "altas-ejercicio" | "bajas-ejercicio") {
        const path = filtro
            ? `/fixedAssets/manage?filtro=${filtro}`
            : "/fixedAssets/manage";
        syncWorkspacePath(path, router);
    }
    const cachedData = useMemo(() => getHomeDashboardFromCache(client), [client]);

    const options: RequestInit = useMemo(
        () => ({
            method: 'POST',
            body: JSON.stringify({ client }),
            headers: { 'Content-Type': 'application/json' }
        }),
        [client]
    );

    const fetchConfig = useMemo(
        () => ({
            initialData: cachedData,
            skipInitialFetch: cachedData != null,
            onData: (nextData: HomeDashboardData) => setHomeDashboardInCache(client, nextData),
        }),
        [cachedData, client]
    );
    const { data } = useFetch<HomeDashboardData>('/api/home', options, fetchConfig);
    const stats = data?.stats ?? { totalBienes: 0, altasEjercicio: 0, bajasEjercicio: 0 };
    const fechaProceso = data?.fechaProceso ?? "-";
    const tabs = data?.tabs ?? [
        { id: 'monedaLocal' as const, title: 'Moneda local', comparison: { title: 'Comparación totales', labels: [], data: [] }, details: [] },
        { id: 'dolaresHB2' as const, title: '', comparison: { title: 'Comparación totales', labels: [], data: [] }, details: [] },
        { id: 'pesosHistoricos' as const, title: '', comparison: { title: 'Comparación totales', labels: [], data: [] }, details: [] },
    ];

    return (
        <main className="home-grid bg-gabu-300 w-full h-full min-w-0 grid grid-cols-2 grid-rows-[minmax(0,45%)_minmax(0,55%)] gap-3 2xl:gap-7 p-4 2xl:p-7 overflow-y-auto overflow-x-hidden [@media(max-height:600px)]:gap-2 [@media(max-height:600px)]:p-2 [@media(max-height:600px)]:grid-rows-[minmax(0,42%)_minmax(0,58%)] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:grid-rows-[minmax(0,44%)_minmax(0,56%)]">
            <div className="w-full h-full min-h-0 min-w-0 bg-gabu-100 rounded-lg">
                <div className="home-stats-list flex flex-col justify-around h-full p-3 2xl:p-5 2xl:gap-5 gap-2 pb-4 2xl:pb-7 [@media(max-height:600px)]:p-1.5 [@media(max-height:600px)]:gap-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1">
                    <StadisticSection title="Total de bienes" total={stats.totalBienes} onClick={() => openAdministrar()} />
                    <StadisticSection title="Altas del ejercicio" total={stats.altasEjercicio} onClick={() => openAdministrar("altas-ejercicio")} />
                    <StadisticSection title="Bajas en el ejercicio" total={stats.bajasEjercicio} onClick={() => openAdministrar("bajas-ejercicio")} />
                </div>
            </div>
            <div className="w-full h-full min-h-0 min-w-0 bg-gabu-100 rounded-lg">
                <DoughnutContainer stats={stats}/>
            </div>
            <div className="w-full h-full min-h-0 min-w-0 bg-gabu-100 rounded-lg col-span-2">
                <ChartsContainer tabs={tabs} fechaProceso={fechaProceso} />
            </div>
        </main>
    );
}