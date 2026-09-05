"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingRow } from "@/components/layout/setting-group";
import type { SettingField, SettingToggle } from "@/hooks/use-setting-field";

type InputProps = Omit<
  React.ComponentProps<typeof Input>,
  "id" | "value" | "disabled" | "onChange"
>;

// A text input wired to a setting field.
export function TextSettingRow<T>({
  id,
  label,
  description,
  layout,
  field,
  disabled,
  ...inputProps
}: {
  id: string;
  label: string;
  description?: string;
  layout?: "row" | "column";
  field: SettingField<T>;
  disabled?: boolean;
} & InputProps): React.ReactElement {
  return (
    <SettingRow
      htmlFor={id}
      label={label}
      description={description}
      layout={layout}
    >
      <Input
        id={id}
        value={field.text}
        disabled={disabled}
        onChange={(event) => field.setText(event.target.value)}
        {...inputProps}
      />
    </SettingRow>
  );
}

// A switch wired to a setting toggle.
export function SwitchSettingRow({
  id,
  label,
  description,
  toggle,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  toggle: SettingToggle;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <SettingRow htmlFor={id} label={label} description={description}>
      <Switch
        id={id}
        checked={toggle.value}
        disabled={disabled}
        onCheckedChange={toggle.toggle}
      />
    </SettingRow>
  );
}
