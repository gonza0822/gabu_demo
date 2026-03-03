import React, { useEffect } from "react"

export default function Modal({children, style, isOpen} : {children : React.ReactNode, style?: string, isOpen: boolean}) : React.ReactElement {

    const dialogRef = React.useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if(dialog){
            if(isOpen){
                dialog.showModal();
            } else {
                dialog.close();
            }
        }
    }, [isOpen]);

    return (
        <dialog className={`${style}`} ref={dialogRef}>{children}</dialog>
    );
}