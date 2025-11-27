import { ReactElement } from "react";
import Search from "../svg/Search";
import ReziseIcon from "../svg/menu/ReziseIcon";
import DesignIcon from "../svg/menu/DesignIcon";
import Config from "../svg/Config";

export default function Header() : ReactElement {
    return (
        <header className="w-full bg-gabu-500 flex justify-end items-center flex-grow-0 h-[6vh]">
            <div className="flex items-center bg-gabu-100 rounded-4xl p-1 2xl:p-2 h-[70%] 2xl:h-[60%] w-[40%] mr-[20%]">
                <Search style="mr-5 ml-1 cursor-pointer 2xl:h-[17px] 2xl:w-[17px] h-[14px] w-[14px]"/>
                <input type="text" placeholder="Buscar..." className="focus:outline-none text-gabu-900 w-full"/>
            </div>
            <div className="flex h-full">
                <div className="w-[67px] h-full flex justify-center items-center hover:bg-gabu-300 transition-all duration-150 cursor-pointer">
                    <ReziseIcon/>
                </div>
                <div className="w-[67px] h-full flex justify-center items-center hover:bg-gabu-300 transition-all duration-150 cursor-pointer">
                    <DesignIcon/>
                </div>
                <div className="w-[67px] h-full flex justify-center items-center hover:bg-gabu-300 transition-all duration-150 cursor-pointer">
                    <Config style="fill-current text-gabu-100 2xl:h-[25px] 2xl:w-[25px] h-[22px] w-[22px]"/>
                </div>
            </div>
        </header>
    );
}