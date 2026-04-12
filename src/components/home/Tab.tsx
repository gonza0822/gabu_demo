import { ReactElement } from "react";
import TabIcon from "../svg/home/TabIcon";

export default function Tab({active, title, onClick, hasBorderLeft, hasBorderRight} : {active : boolean, title: string, onClick: () => void, hasBorderLeft?: boolean, hasBorderRight?: boolean}) : ReactElement {
    return (
        <div className={`graphic-tab active relative flex justify-center items-center w-[20%] 2xl:w-[14%] h-full [@media(max-height:600px)]:w-[22%] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:w-[22%] ${!active && 'cursor-pointer group hover:bg-gabu-300 transition-all duration-150'}`} onClick={onClick}>
            {active && <TabIcon/>}
            <p className={`home-tab-label absolute select-none text-xs xl:text-sm 2xl:text-base [@media(max-height:600px)]:text-[11px] [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-[11px] ${active ? 'text-gabu-700 border-gabu-100' : `${hasBorderLeft ? 'border-l-1' : ''} ${hasBorderRight ? 'border-r-1' : ''} text-gabu-100 border-gabu-100 w-full text-center group-hover:text-gabu-700 transition-all duration-150`}`}>{title}</p>
        </div>
    );
};