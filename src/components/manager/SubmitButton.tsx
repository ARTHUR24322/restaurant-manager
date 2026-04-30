"use client"

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
    className?: string;
    children: React.ReactNode;
    loadingText?: string;
    onClick?: () => void;
    type?: "submit" | "button" | "reset";
    isLoading?: boolean;
}

export function SubmitButton({ className, children, loadingText = "Chargement...", onClick, type = "submit", isLoading }: SubmitButtonProps) {
    const { pending } = useFormStatus();
    const isActuallyLoading = isLoading !== undefined ? isLoading : pending;

    return (
        <button
            type={type}
            disabled={isActuallyLoading}
            onClick={onClick}
            className={cn(
                "w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl mt-2 hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                className
            )}
        >
            {isActuallyLoading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{loadingText}</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}
