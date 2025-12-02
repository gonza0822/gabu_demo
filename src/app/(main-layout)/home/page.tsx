import './styles.css';
import { ReactElement } from 'react';
import NavigationContainer from '@/components/menu/NavigationContainer';
import ChartsContainer from '@/components/home/ChartsContainer';
import DoughnutContainer from '@/components/home/DoughnutContainer';
import StadisticSection from '@/components/home/StadisticSection';

export default function Home() : ReactElement {

    return (
        <main className="bg-gabu-300 w-full h-full bg-gabu-300 grid grid-cols-2 grid-rows-2 gap-3 2xl:gap-7 p-4 2xl:p-7 overflow-auto">
            <div className="w-full h-full bg-gabu-100 rounded-lg">
                <div className="flex flex-col justify-around h-full p-3 2xl:p-5 2xl:gap-5 gap-2">
                    <StadisticSection title="Total de bienes" total={14392} />
                    <StadisticSection title="Bienes de este mes" total={1209} />
                    <StadisticSection title="Bienes dados de baja" total={7233} />
                </div>
            </div>
            <div className="w-full h-full bg-gabu-100 rounded-lg">
                <DoughnutContainer/>
            </div>
            <div className="w-full h-full bg-gabu-100 rounded-lg col-span-2">
                <ChartsContainer/>
            </div>
        </main>
    );
}