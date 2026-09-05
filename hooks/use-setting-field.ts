import { useState } from "react";

export interface SettingField<T> {
  text: string;
  setText: (next: string) => void;
  committed: T;
  setCommitted: (next: T) => void;
  isDirty: boolean;
  reset: () => void;
  parse: (text: string) => { value: T } | null;
  format: (value: T) => string;
}

// Text-backed setting holding local edit state.
export function useSettingField<T>({
  initial,
  format,
  parse,
}: {
  initial: T;
  format: (value: T) => string;
  parse: (text: string) => { value: T } | null;
}): SettingField<T> {
  const [committed, setCommittedState] = useState(initial);
  const [text, setText] = useState(() => format(initial));

  const isDirty = text !== format(committed);

  function setCommitted(next: T): void {
    setCommittedState(next);
    setText(format(next));
  }

  function reset(): void {
    setText(format(committed));
  }

  return {
    text,
    setText,
    committed,
    setCommitted,
    isDirty,
    reset,
    parse,
    format,
  };
}

export interface SettingToggle {
  value: boolean;
  setValue: (next: boolean) => void;
  toggle: (next: boolean) => void;
  initial: boolean;
  setInitial: (next: boolean) => void;
  isDirty: boolean;
  reset: () => void;
}

// Switch-backed setting holding local toggle state.
export function useSettingToggle(initial: boolean): SettingToggle {
  const [initialValue, setInitialValue] = useState(initial);
  const [value, setValue] = useState(initial);

  const isDirty = value !== initialValue;

  function setInitial(next: boolean): void {
    setInitialValue(next);
    setValue(next);
  }

  function reset(): void {
    setValue(initialValue);
  }

  function toggle(next: boolean): void {
    setValue(next);
  }

  return {
    value,
    setValue,
    toggle,
    initial: initialValue,
    setInitial,
    isDirty,
    reset,
  };
}
