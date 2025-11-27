import { ReactElement } from "react";
import { Submenu } from "./NavigationMenu";

export default function SubmenuItem({submenuItem, isTheLast} : {submenuItem: Submenu, isTheLast: boolean}) : ReactElement {
    return (
        <li className="group" key={submenuItem.submenuId}>
            <div className={`flex items-center gap-3 px-1 py-2 ${isTheLast ? '' : 'border-b-1 border-gabu-300'} group-hover:border-gabu-100 transition-all duration-150`}>
                <span className="inline-block 2xl:h-[10px] 2xl:w-[10px] w-[8px] h-[8px] bg-gabu-300 rounded-full group-hover:bg-gabu-100"></span>
                <p className="text-gabu-300 text-xs 2xl:text-base group-hover:text-gabu-100 transition-all duration-150 btn-accounts-table">{submenuItem.submenuTitle}</p>
            </div>
        </li>
    );
}