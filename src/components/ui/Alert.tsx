import { ReactElement } from "react";
import { AnimatePresence, motion } from "motion/react";
import Cross from "@/components/svg/Cross";
import { useState, useEffect } from "react";

export default function Alert({
    message,
    type,
    show,
    onClose: onCloseProp
}: {
    message: string | null;
    type: "error" | "success" | "info" | "warning";
    show: boolean;
    onClose?: () => void;
}) : ReactElement {

    const [showAlert, setShowAlert] = useState<boolean>(show);

    function onClose() {
        setShowAlert(false);
        onCloseProp?.();
    }

    useEffect(() => {
        setShowAlert(show);
    }, [show])

    useEffect(() => {
        if (!show) return;
        const timer = setTimeout(() => {
            setShowAlert(false);
            onCloseProp?.();
        }, 10000);
        return () => clearTimeout(timer);
    }, [show, onCloseProp]);

    let style : string;

    switch(type){
        case "error":
            style = "bg-gabu-error/75 border-gabu-error";
            break;
        case "success":
            style = "bg-gabu-success/75 border-gabu-success";
            break;
        case "info":
            style = "bg-gabu-info/75 border-gabu-info";
            break;
        case "warning":
            style = "bg-gabu-warning/75 border-gabu-warning";
            break;
        default:
            style = "bg-gabu-error/75 border-gabu-error";
            break;
    }

    return (
        <AnimatePresence mode="wait">
            {showAlert && (
                <motion.div className={`fixed top-0 left-0 w-full h-[6%] p-4 border-2 ${style} bg-opacity-75 flex items-center justify-center`} key="login-message" initial={{y: -20, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: -20, opacity: 0}} transition={{duration: 0.3, ease: "easeInOut"}}>
                    <p className="text-gabu-100 text-xl ">{message}</p>
                    <Cross onClick={onClose} style="h-[24px] w-[24px] fill-current text-gabu-100 absolute right-10 cursor-pointer"/>
                </motion.div>
            )}
        </AnimatePresence>
    );
}