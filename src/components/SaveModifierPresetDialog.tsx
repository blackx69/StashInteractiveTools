import React from 'react';
import { Form } from 'react-bootstrap';
import { SettingModal } from './SettingModal';

type SaveModifierPresetDialogProps = {
  onClose: (value?: string) => void;
  value?: string;
};
/*
const SettingModel = React.lazy<
  React.ComponentType<Parameters<typeof components.SettingModel>[0]>
>(
  () =>
    //eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    import('./components/Settings/Settings'),
);  */
export const SaveModifierPresetDialog = ({
  onClose,
  value = '',
}: SaveModifierPresetDialogProps) => {
  return (
    <SettingModal<string>
      heading="Save Modifier Preset"
      close={onClose}
      value={value}
      renderField={(v: string, setValue) => (
        <Form.Control
          placeholder="Enter name of preset"
          className="text-input"
          value={v}
          isValid={v.length > 1}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setValue(e.currentTarget.value)
          }
        />
      )}
    />
  );
};
