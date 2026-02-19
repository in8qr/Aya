"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AnimateInViewProps = {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-in" | "fade-in-up" | "fade-in-down" | "slide-in-right";
  delay?: number;
  rootMargin?: string;
  once?: boolean;
};

export function AnimateInView({
  children,
  className,
  animation = "fade-in-up",
  delay = 0,
  rootMargin = "0px 0px -40px 0px",
  once = true,
}: AnimateInViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
        else if (!once) setVisible(false);
      },
      { rootMargin, threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, once]);

  const animationClass =
    animation === "fade-in"
      ? "animate-fade-in"
      : animation === "fade-in-up"
        ? "animate-fade-in-up"
        : animation === "fade-in-down"
          ? "animate-fade-in-down"
          : "animate-slide-in-right";

  return (
    <div
      ref={ref}
      className={cn(
        "opacity-0",
        visible && animationClass,
        className
      )}
      style={visible && delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
