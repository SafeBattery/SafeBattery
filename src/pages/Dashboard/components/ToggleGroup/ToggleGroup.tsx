// ToggleGroup.tsx
import React from "react";
import styles from "./ToggleGroup.module.css";

interface ToggleGroupProps<T extends string> {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
}

export function ToggleGroup<T extends string>({
  items,
  value,
  onChange,
  "aria-label": ariaLabel,
}: ToggleGroupProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={styles.group}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className={
            value === item
              ? `${styles.item} ${styles.active}`
              : styles.item
          }
          aria-pressed={value === item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}