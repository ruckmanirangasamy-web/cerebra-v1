/**
 * OrbToolButton.tsx
 * Reusable radial arc button for the Radial Orb fan-out.
 */
import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface OrbToolButtonProps {
    icon: LucideIcon;
    label: string;
    angleDeg: number;     // arc position in degrees
    delay: number;        // stagger delay in seconds
    accentColor: string;  // ring accent color hex
    onClick: () => void;
}

export function OrbToolButton({
    icon: Icon,
    label,
    index,
    delay,
    accentColor,
    onClick,
}: OrbToolButtonProps & { index?: number }) {
    // Stack vertically above the main orb. Main orb is at (0,0).
    // Each button goes up by `offset` pixels.
    const spacing = 64; // distance between buttons
    const y = -((index !== undefined ? index + 1 : 1) * spacing);
    const x = 0; // Straight line up

    return (
        <motion.button
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: 1, x, y, scale: 1 }}
            exit={{ opacity: 0, x: 0, y: 0, scale: 0, transition: { duration: 0.18, ease: "easeIn" } }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.8,
                delay,
            }}
            onClick={onClick}
            className="absolute bottom-0 right-0 flex items-center justify-center group"
            whileTap={{ scale: 1.1 }}
        >
            {/* Accent ring */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    border: `2px solid ${accentColor}80`,
                    borderRadius: "50%",
                }}
            />
            {/* Button body */}
            <div
                className="relative w-12 h-12 rounded-full flex items-center justify-center text-white transition-all z-10"
                style={{
                    background: "rgba(6,8,16,0.90)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backdropFilter: "blur(12px)",
                }}
            >
                <Icon className="w-5 h-5 drop-shadow-md" />
            </div>

            {/* Label pill — always shown on mobile, hover-only on desktop */}
            <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: delay + 0.08, duration: 0.12 }}
                className="absolute top-full mt-1.5 px-2.5 py-1 rounded-lg text-white whitespace-nowrap pointer-events-none
                   lg:top-auto lg:bottom-auto lg:right-full lg:mr-2 lg:mt-0
                   lg:opacity-0 lg:group-hover:opacity-100 lg:transition-opacity"
                style={{
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    fontWeight: 700,
                }}
            >
                {label}
            </motion.span>
        </motion.button>
    );
}
