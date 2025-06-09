import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
}

export const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Create context to pass down state and handlers
  const contextValue = {
    isOpen,
    setIsOpen,
    value,
    onValueChange,
  };

  return (
    <div ref={selectRef} className="relative w-full">
      <SelectContext.Provider value={contextValue}>
        {children}
      </SelectContext.Provider>
    </div>
  );
};

// Create context
const SelectContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

// Custom hook to use Select context
const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select component");
  }
  return context;
};

export const SelectTrigger = ({ children, className }: SelectTriggerProps) => {
  const { isOpen, setIsOpen } = useSelectContext();

  return (
    <div
      className={cn(
        "cursor-pointer flex items-center justify-between p-2 rounded-md border border-input bg-background",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      {isOpen ? (
        <ChevronUp className="h-4 w-4 opacity-50" />
      ) : (
        <ChevronDown className="h-4 w-4 opacity-50" />
      )}
    </div>
  );
};

export const SelectContent = ({ children, className}: SelectContentProps) => {
  const { isOpen } = useSelectContext();

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute z-[200] min-w-[8rem] rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        "w-full mt-2",
        className
      )}
    >
      <div className="max-h-[300px] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export const SelectItem = ({
  value: itemValue,
  children,
  className,
}: SelectItemProps) => {
  const { value, onValueChange, setIsOpen } = useSelectContext();
  const isSelected = value === itemValue;

  const handleClick = () => {
    onValueChange(itemValue);
    setIsOpen(false);
  };

  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent/50",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

export const SelectValue = ({
  placeholder = "Select an option",
}: SelectValueProps) => {
  const { value } = useSelectContext();
  return <span className="text-sm">{value || placeholder}</span>;
};
