import { useState, useEffect } from "react";

interface AnimatedNumberProps {
  to: number;
  suffix?: string;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({
  to,
  suffix = "",
  className = "",
  duration = 800
}: AnimatedNumberProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timeout = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 300);

    return () => clearTimeout(timeout);
  }, [to, duration]);

  return (
    <span className={className}>
      {value}{suffix}
    </span>
  );
}
