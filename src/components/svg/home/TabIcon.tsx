import { ReactElement } from "react";
import { motion } from "framer-motion";

export default function TabIcon(): ReactElement {
    return (
        <motion.div layoutId="tab-icon" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} className="absolute inset-0">
            <motion.svg width="219" height="48" viewBox="0 0 219 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`fill-current h-full w-full text-gabu-100`} preserveAspectRatio="none">
                <path d="M13.1924 6.941C14.5213 2.80492 18.3687 0 22.713 0H196.361C200.86 0 204.804 3.0035 206.001 7.3397L211.289 26.5L219 48H0L13.1924 6.941Z"/>
            </motion.svg>
        </motion.div>
    );
}