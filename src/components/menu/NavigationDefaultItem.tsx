import { ReactElement } from "react";

export default function NavigationDefaultItem({icon, title, onClick} : {icon  : React.ComponentType; title: string; onClick : (e : React.MouseEvent<HTMLLIElement>) => void}) : ReactElement {
    const Icon : React.ComponentType = icon;

    return (
        <li onClick={onClick}>
            <div className="group flex gap-3 cursor-pointer">
                <Icon/>
                <p className="btn-close-session text-gabu-300 text-sm 2xl:text-lg group-hover:text-gabu-100 transition-all duration-150">{title}</p>
            </div>
        </li>
    );
}