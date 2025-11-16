import { ReactElement } from "react";
import Search from "../svg/Search";
import ReziseIcon from "../svg/menu/ReziseIcon";
import DesignIcon from "../svg/menu/DesignIcon";
import Config from "../svg/Config";

export default function Header() : ReactElement {
    return (
        <header className="w-full bg-gabu-500 flex justify-end items-center flex-grow-0 h-[6vh]">
            <div className="flex bg-gabu-100 rounded-4xl p-2 h-8 w-[40%] mr-[20%]">
                <Search size={17} style="mr-5 cursor-pointer"/>
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
                    <Config size={25} style="fill-current text-gabu-100"/>
                </div>
            </div>
        </header>
    );
}