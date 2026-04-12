'use client';

import './styles.css';
import { ReactElement, useMemo } from 'react';
import ChartsContainer from '@/components/home/ChartsContainer';
import DoughnutContainer from '@/components/home/DoughnutContainer';
import StadisticSection from '@/components/home/StadisticSection';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useFetch } from '@/hooks/useFetch';
import { HomeDashboardData } from '@/lib/models/Home';

export default function Home() : ReactElement {
    const client = useSelector((state: RootState) => state.authorization.client);

    const options: RequestInit = useMemo(
        () => ({
            method: 'POST',
            body: JSON.stringify({ client }),
            headers: { 'Content-Type': 'application/json' }
        }),
        [client]
    );

    const { data } = useFetch<HomeDashboardData>('/api/home', options);
    const stats = data?.stats ?? { totalBienes: 0, altasEjercicio: 0, bajasEjercicio: 0 };
    const tabs = data?.tabs ?? [
        { id: 'monedaLocal' as const, title: 'Moneda local', charts: [] },
        { id: 'dolaresHB2' as const, title: 'Dolares HB2', charts: [] },
        { id: 'pesosHistoricos' as const, title: 'Pesos historicos', charts: [] },
    ];

    return (
        <main className="home-grid bg-gabu-300 w-full h-full min-w-0 grid grid-cols-2 grid-rows-[minmax(0,45%)_minmax(0,55%)] gap-3 2xl:gap-7 p-4 2xl:p-7 overflow-y-auto overflow-x-hidden [@media(max-height:600px)]:gap-2 [@media(max-height:600px)]:p-2 [@media(max-height:600px)]:grid-rows-[minmax(0,42%)_minmax(0,58%)] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-2 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:grid-rows-[minmax(0,44%)_minmax(0,56%)]">
            <div className="w-full h-full min-h-0 min-w-0 bg-gabu-100 rounded-lg">
                <div className="home-stats-list flex flex-col justify-around h-full p-3 2xl:p-5 2xl:gap-5 gap-2 pb-4 2xl:pb-7 [@media(max-height:600px)]:p-1.5 [@media(max-height:600px)]:gap-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:p-1.5 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-1">
                    <StadisticSection title="Total de bienes" total={stats.totalBienes} />
                    <StadisticSection title="Altas del ejercicio" total={stats.altasEjercicio} />
                    <StadisticSection title="Bajas en el ejercicio" total={stats.bajasEjercicio} />
                </div>
            </div>
            <div className="w-full h-full min-h-0 min-w-0 bg-gabu-100 rounded-lg">
                <DoughnutContainer stats={stats}/>
            </div>
            <div className="w-full h-full min-h-0 min-w-0 bg-gabu-100 rounded-lg col-span-2">
                <ChartsContainer tabs={tabs}/>
            </div>
        </main>
    );
}