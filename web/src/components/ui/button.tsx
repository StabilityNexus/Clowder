import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useTheme } from "next-themes"; // Import the `useTheme` hook
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#D0F4FF] text-black border-2 border-black rounded-full font-[Bebas Neue] text-[24px] w-[220px] h-[42px] hover:bg-[#D0F4FF]/90",
        dark:
          "bg-[#BA9901] text-black border-2 border-white rounded-full font-[Bebas Neue] text-[24px] w-[220px] h-[42px] hover:bg-[#BA9901]/90",
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
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const { theme, resolvedTheme } = useTheme();
    const [isThemeReady, setIsThemeReady] = React.useState(false);

    // Wait for the theme to resolve
    React.useEffect(() => {
      if (resolvedTheme) setIsThemeReady(true);
    }, [resolvedTheme]);

    // Avoid rendering until the theme is resolved
    if (!isThemeReady) return null;

    return (
      <Comp
        className={cn(buttonVariants({ variant: theme === "dark" ? "dark" : "default", size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
