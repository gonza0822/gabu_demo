import { ReactElement } from "react";
import Arrow from "../svg/Arrow";

export default function StadisticSection({title, total} : {title: string, total: number}): ReactElement {
    return (
        <div className="home-stats-card flex rounded-2xl bg-gradient-to-r flex justify-between items-center from-gabu-300 from-50% to-gabu-500 px-6 group cursor-pointer [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:px-3 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:rounded-xl">
            <div className="flex flex-col py-2 xl:py-4 gap-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:py-1 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:gap-0.5">
                <p className="home-stats-title text-gabu-900 text-sm 2xl:text-lg font-medium [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-xs">{title}</p>
                <p className="home-stats-total text-gabu-900 text-lg xl:text-xl 2xl:text-3xl font-semibold [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:text-xl">{total}</p>
            </div>
            <div className="[@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:scale-80 [@media(min-width:1100px)_and_(max-width:1366px)_and_(max-height:620px)]:origin-right">
                <Arrow height={35} width={23} color="text-gabu-900" hoverStyle="group-hover:stroke-gabu-100" defaultRotation="0" activeRotation="0" active={false}/>
            </div>
        </div>
    );
}