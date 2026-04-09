import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-[var(--btn-border)] bg-[var(--btn-bg)] text-[var(--btn-text)] hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-bg-hover)] hover:text-[var(--btn-text-hover)]",
        destructive:
          "border-[var(--color-error)] bg-[var(--color-error)] text-[var(--color-white)] hover:border-[var(--color-dark)] hover:bg-[var(--color-dark)] hover:text-[var(--color-white)]",
        outline:
          "border-[var(--color-brand-green-border)] bg-[var(--color-brand-green-tint)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-green)] hover:bg-[var(--color-brand-green)] hover:text-[var(--color-dark)]",
        secondary:
          "border-[var(--btn-dark-bg)] bg-[var(--btn-dark-bg)] text-[var(--btn-dark-text)] hover:border-[var(--btn-dark-bg-hover)] hover:bg-[var(--btn-dark-bg-hover)] hover:text-[var(--btn-dark-text-hover)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-brand-green-tint)]",
        link: "border-transparent bg-transparent p-0 text-[var(--color-text-primary)] underline-offset-4 hover:underline hover:text-[var(--color-link-hover)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
