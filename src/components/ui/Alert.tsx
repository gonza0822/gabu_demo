import { ReactElement } from "react";
import { AnimatePresence, motion } from "motion/react";
import Cross from "@/components/svg/Cross";
import { useState, useEffect } from "react";

export default function Alert({
    message,
    type,
    show
}: {
    message: string | null;
    type: "error" | "success" | "info" | "warning";
    show: boolean;
}) : ReactElement {

    const [showAlert, setShowAlert] = useState<boolean>(show);

    function onClose() {
        setShowAlert(false);
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowAlert(false);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    let color : string;

    switch(type){
        case "error":
            color = "gabu-error";
            break;
        case "success":
            color = "gabu-success";
            break;
        case "info":
            color = "gabu-info";
            break;
        case "warning":
            color = "gabu-warning";
            break;
        default:
            color = "gabu-error";
            break;
    }

    console.log(color);

    return (
        <AnimatePresence mode="wait">
            {showAlert && (
                <motion.div className={`absolute top-0 w-full h-[6%] p-4 border text-${color} bg-${color} flex items-center justify-center`} key="login-error-message" initial={{y: -20, opacity: 0}} animate={{y: 0, opacity: 1}} exit={{y: -20, opacity: 0}} transition={{duration: 0.3, ease: "easeInOut"}}>
                    <p className="text-gabu-100 text-xl ">{message}</p>
                    <Cross onClick={onClose} style="h-[24px] w-[24px] fill-current text-gabu-100 absolute right-10 cursor-pointer"/>
                </motion.div>
            )}
        </AnimatePresence>
    );
}