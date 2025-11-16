import './styles.css';
import { ReactElement } from 'react';
import NavigationContainer from '@/components/menu/NavigationContainer';

export default function Home() : ReactElement {
  return (
    <NavigationContainer>
      <main className="bg-gabu-300 w-full h-full bg-gabu-300 grid grid-cols-2 grid-rows-2 gap-7 p-7">
        <div className="w-full h-full bg-gabu-100 rounded-lg">
        <div className="flex flex-col justify-around h-full p-5 gap-5">
            <div className="flex rounded-2xl bg-gradient-to-r flex justify-between items-center  from-gabu-300 from-50% to-gabu-500 px-6 group cursor-pointer">
            <div className="flex flex-col py-4 gap-1">
                <p className="text-gabu-900 text-lg font-medium">Total de bienes</p>
                <p className="text-gabu-900 text-3xl font-semibold">14392</p>
            </div>
            <svg width="33" height="45" viewBox="0 0 10 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-900 stroke stroke-transparent group-hover:stroke-gabu-100 transition-all duration-150 ">
                <path fillRule="evenodd" clip-rule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
            </svg>
            </div>
            <div className="flex rounded-2xl bg-gradient-to-r flex justify-between items-center from-gabu-300 from-50% to-gabu-500 px-6 group cursor-pointer">
            <div className="flex flex-col py-4 gap-1">
                <p className="text-gabu-900 text-lg font-medium">Bienes de este mes</p>
                <p className="text-gabu-900 text-3xl font-semibold">1209</p>
            </div>
            <svg width="33" height="45" viewBox="0 0 10 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-900 stroke stroke-transparent group-hover:stroke-gabu-100 transition-all duration-150 ">
                <path fillRule="evenodd" clip-rule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
            </svg>
            </div>
            <div className="flex rounded-2xl bg-gradient-to-r flex justify-between items-center from-gabu-300 from-50% to-gabu-500 px-6 group cursor-pointer">
            <div className="flex flex-col py-4 gap-1">
                <p className="text-gabu-900 text-lg font-medium">Bienes dados de baja</p>
                <p className="text-gabu-900 text-3xl font-semibold">7233</p>
            </div>
            <svg width="33" height="45" viewBox="0 0 10 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-900 stroke stroke-transparent group-hover:stroke-gabu-100 transition-all duration-150 ">
                <path fillRule="evenodd" clip-rule="evenodd" d="M8.90061 5.55547L1.85507 10L0.0939941 8.88906L6.259 5L0.0939941 1.11094L1.85507 0L8.90061 4.44453C9.1341 4.59187 9.26527 4.79167 9.26527 5C9.26527 5.20833 9.1341 5.40813 8.90061 5.55547Z"/>
            </svg>
            </div>
        </div>
        </div>
        <div className="w-full h-full bg-gabu-100 rounded-lg">
        <div className="flex flex-col h-full">
            <div className="w-full justify-start px-12 pt-7">
            <p className="text-3xl text-gabu-900 font-medium">Uso de bienes</p>
            </div>
            <div className="flex gap-10 px-12 h-full justify-center pb-2">
            <div className="relative flex justify-center items-center h-full">
                <div className="z-10 h-[90%]">
                <canvas id="grafico-dona-bienes"></canvas>
                </div>
                <div className="absolute bg-gabu-100 flex flex-col justify-center items-center">
                <p className="text-gabu-900 text-md font-medium">Total bienes</p>
                <p className="text-gabu-900 text-3xl font-semibold">14392</p>
                </div>
            </div>

            <div className="flex flex-col gap-10 justify-center">
                <div className="flex gap-3 items-center">
                <span className="h-3 w-3 bg-gabu-900"></span>
                <p className="text-gabu-900 text-md font-medium">Bienes en uso</p>
                </div>
                <div className="flex gap-3 items-center">
                <span className="h-3 w-3 bg-gabu-300"></span>
                <p className="text-gabu-900 text-md font-medium">Bienes fuera en uso</p>
                </div>
                <div className="flex gap-3 items-center">
                <span className="h-3 w-3 bg-gabu-500"></span>
                <p className="text-gabu-900 text-md font-medium">Bienes en mantenimiento</p>
                </div>
            </div>
            </div>
        </div>
        </div>
        <div className="w-full h-full bg-gabu-100 rounded-lg col-span-2">
        <div className="flex flex-col h-full">
            <div className="flex w-full h-[10%] bg-gabu-500 rounded-t-lg px-10">
            <div className="graphic-tab active relative flex justify-center items-center w-[14%]" data-for="inversion-proyectos">
                <svg width="219" height="48" viewBox="0 0 219 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-100 h-full w-full" preserveAspectRatio="none">
                <path d="M13.1924 6.941C14.5213 2.80492 18.3687 0 22.713 0H196.361C200.86 0 204.804 3.0035 206.001 7.3397L211.289 26.5L219 48H0L13.1924 6.941Z"/>
                </svg>
                <p className="absolute text-gabu-700 border-gabu-100">Inversion proyectos</p>
            </div>
            <div className="graphic-tab relative flex justify-center items-center w-[14%] cursor-pointer group hover:bg-gabu-300 transition-all duration-150" data-for="amortizaciones">
                <svg width="219" height="48" viewBox="0 0 219 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-500 h-full w-full group-hover:text-gabu-300 transition-all duration-150" preserveAspectRatio="none">
                <path d="M13.1924 6.941C14.5213 2.80492 18.3687 0 22.713 0H196.361C200.86 0 204.804 3.0035 206.001 7.3397L211.289 26.5L219 48H0L13.1924 6.941Z"/>
                </svg>
                <p className="absolute text-gabu-100 border-r-1 border-gabu-100 w-full text-center group-hover:text-gabu-700 transition-all duration-150">Amortizaciones</p>
            </div>
            <div className="graphic-tab relative flex justify-center items-center w-[14%] cursor-pointer group hover:bg-gabu-300 transition-all duration-150" data-for="ejercicios">
                <svg width="219" height="48" viewBox="0 0 219 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current text-gabu-500 h-full w-full group-hover:text-gabu-300 transition-all duration-150" preserveAspectRatio="none">
                <path d="M13.1924 6.941C14.5213 2.80492 18.3687 0 22.713 0H196.361C200.86 0 204.804 3.0035 206.001 7.3397L211.289 26.5L219 48H0L13.1924 6.941Z"/>
                </svg>
                <p className="absolute text-gabu-100 border-l-1 border-gabu-100 w-full text-center group-hover:text-gabu-700 transition-all duration-150">Ejercicio</p>
            </div>
            </div>
            <div className="flex h-full w-full overflow-x-auto" id="inversion-proyectos">
            <div className="flex flex-col mx-5 my-4 gap-3 min-w-[40%]">
                <p className="text-xl text-gabu-700">Proyecto Planta mendoza</p>
                <div className="relative flex h-full w-full">
                <canvas id="planta-mendoza" className="absolute inset-0"></canvas>
                </div>
            </div>
            <div className="flex flex-col mx-5 my-4 gap-3 min-w-[40%]">
                <p className="text-xl text-gabu-700">Ampliacion Fabrica principal</p>
                <div className="relative flex h-full w-full">
                <canvas id="fabrica-principal" className="absolute inset-0"></canvas>
                </div>
            </div>
            <div className="flex flex-col mx-5 my-4 gap-3 min-w-[40%]">
                <p className="text-xl text-gabu-700">Proyecto Nueva fabrica</p>
                <div className="relative flex h-full w-full">
                <canvas id="nueva-fabrica" className="absolute inset-0"></canvas>
                </div>
            </div>
            </div>
            <div className="h-full w-full hidden" id="amortizaciones">
            <div className="flex flex-col mx-5 my-4 gap-3 min-w-[40%]">
                <p className="text-xl text-gabu-700">Computadoras de oficina</p>
                <div className="relative flex h-full w-full">
                <canvas id="pc-oficina" className="absolute inset-0"></canvas>
                </div>
            </div>
            <div className="flex flex-col mx-5 my-4 gap-3 min-w-[40%]">
                <p className="text-xl text-gabu-700">Maquina industrial</p>
                <div className="relative flex h-full w-full">
                <canvas id="maquina-industrial" className="absolute inset-0"></canvas>
                </div>
            </div>
            </div>
            <div className="h-full w-full hidden" id="ejercicios">
            <div className="flex flex-col mx-5 my-4 gap-3 min-w-[95%]">
                <p className="text-xl text-gabu-700">Amortizacio acumulada ejercicio actual</p>
                <div className="relative flex h-full w-full">
                <canvas id="ejercicio-actual" className="absolute inset-0"></canvas>
                </div>
            </div>
            </div>
        </div>
        </div>
      </main>
    </NavigationContainer>
  );
}