import { ReactElement } from "react";
import Arrow from "../svg/Arrow";

export default function StadisticSection({title, total} : {title: string, total: number}): ReactElement {
    return (
        <div className="flex rounded-2xl bg-gradient-to-r flex justify-between items-center from-gabu-300 from-50% to-gabu-500 px-6 group cursor-pointer">
            <div className="flex flex-col py-2 xl:py-4 gap-1">
                <p className="text-gabu-900 text-sm 2xl:text-lg font-medium">{title}</p>
                <p className="text-gabu-900 text-lg xl:text-xl 2xl:text-3xl font-semibold">{total}</p>
            </div>
            <Arrow height={35} width={23} color="text-gabu-900" hoverStyle="group-hover:stroke-gabu-100" defaultRotation="0" activeRotation="0" active={false}/>
        </div>
    );
}