import { components } from '../api';
import { Button, Form } from 'react-bootstrap';
import { faPencil } from '@fortawesome/free-solid-svg-icons';
import { AnyModifierContext, AnyModifierDef, MODIFIERS } from './modifiers';
import React, { ChangeEventHandler, useCallback, useState } from 'react';
import { ModifierEditor } from './ModifierEditor';
import { ActiveModifiers } from './modifiers/block';
import { useInteractiveTools } from '../hooks';

const { Icon } = components;

export const ModifyScript = () => {
  const [add, setAdd] = useState(false);
  const onAddModification = useCallback(() => {
    setAdd(true);
  }, [setAdd]);
  const [currentModifier, setCurrentModifier] = useState<AnyModifierDef | null>(
    null,
  );

  const [activeModifications, setActiveModifications] = useState<
    AnyModifierDef[]
  >([]);

  const { updateModifiers } = useInteractiveTools();
  const onCurrentModifierChanged: ChangeEventHandler<HTMLSelectElement> =
    useCallback(
      (e) => {
        const modifier = MODIFIERS.find(
          (m) => m.id === e.target.value,
        ) as unknown as AnyModifierDef;
        setCurrentModifier(modifier ? { ...modifier } : null);
      },
      [setCurrentModifier],
    );
  const onUpdateModifiers = useCallback(
    (modifiers: AnyModifierDef[]) => {
      setActiveModifications(modifiers);
      updateModifiers(modifiers);
    },
    [updateModifiers],
  );
  const onModifierChanged = useCallback(
    <T extends AnyModifierDef, O extends AnyModifierContext>(
      modifier: T,
      values: O,
    ) => {
      const updated = [...activeModifications];
      const foundIndex = updated.findIndex((m) => m === modifier);
      const updatedModifier = {
        ...modifier,

        options: modifier.options.map((option) => {
          return {
            ...option,
            value: values[option.name] ?? option.defaultValue,
          };
        }),
      };
      if (foundIndex >= 0) {
        updated[foundIndex] = updatedModifier;
      } else {
        updated.push(updatedModifier);
      }

      setAdd(false);
      setCurrentModifier(null);
      onUpdateModifiers(updated);
    },
    [activeModifications, onUpdateModifiers],
  );

  return (
    <div className="container stash-interactive-tools-modify">
      <Form.Group>
        <div className="d-flex justify-content-start">
          <Button
            disabled={!!currentModifier}
            onClick={onAddModification}
            className="minimal d-flex align-items-center h-100"
            title={'Add modifier'}
          >
            <Icon icon={faPencil} />
          </Button>
        </div>
      </Form.Group>

      {add && (
        <Form.Group>
          <Form.Control
            as="select"
            id="stash-interactive-tools-select-modifier"
            className="input-control"
            value={currentModifier?.id}
            onChange={onCurrentModifierChanged}
          >
            <option value="">Select Modification</option>
            {MODIFIERS.map((modifier) => (
              <option value={modifier.id} key={modifier.id}>
                {modifier.name}
              </option>
            ))}
          </Form.Control>
        </Form.Group>
      )}
      {currentModifier && (
        <ModifierEditor
          modifier={currentModifier}
          onChange={onModifierChanged}
        />
      )}
      {!currentModifier && activeModifications.length > 0 && (
        <ActiveModifiers
          onEdit={setCurrentModifier}
          modifiers={activeModifications}
          onUpdate={onUpdateModifiers}
        />
      )}
    </div>
  );
};
