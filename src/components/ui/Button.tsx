import { ReactElement } from "react";

export default function Button({
    text,
    isLogin,
    type = "button",
    disabled = false,
    handleClick,
}: {
    text: string;
    isLogin: boolean;
    type: "button" | "submit" | "reset";
    disabled?: boolean;
    handleClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) : ReactElement {
    return (
        <button type={type} className={`btn-register w-full bg-gabu-900 text-gabu-100 rounded-md p-2 text-lg mt-7 hover:bg-gabu-700 transition-all duration-150 cursor-pointer ${disabled && 'opacity-50 cursor-not-allowed'}`} onClick={handleClick} disabled={disabled}>{text}</button>
    );
}