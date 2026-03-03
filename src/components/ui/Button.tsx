import { ReactElement } from "react";

export default function Button({
    text,
    type = "button",
    disabled = false,
    handleClick,
    style,
}: {
    text: string;
    type: "button" | "submit" | "reset";
    disabled?: boolean;
    handleClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    style: string;
}) : ReactElement {
    return (
        <button type={type} className={`${style} ${disabled && 'opacity-50 cursor-not-allowed'}`} onClick={handleClick} disabled={disabled}>{text}</button>
    );
}