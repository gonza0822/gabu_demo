import React, { useEffect } from "react"

export default function Modal({
    children,
    style,
    isOpen,
    blockDismissal = false,
}: {
    children: React.ReactNode;
    style?: string;
    isOpen: boolean;
    /** Si true: Escape y clic fuera no cierran el diálogo (p. ej. operación en curso). */
    blockDismissal?: boolean;
}): React.ReactElement {
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

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || !blockDismissal) return;
        const onCancel = (e: Event) => {
            e.preventDefault();
        };
        dialog.addEventListener("cancel", onCancel);
        return () => dialog.removeEventListener("cancel", onCancel);
    }, [blockDismissal, isOpen]);

    return (
        <dialog className={`${style}`} ref={dialogRef}>{children}</dialog>
    );
}