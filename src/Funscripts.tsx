import { ChangeEventHandler, useCallback } from 'react';
import { libraries, React } from './api';

const fullWidthProps = {
  labelProps: {
    column: true,
    sm: 3,
    xl: 12,
  },
  fieldProps: {
    sm: 9,
    xl: 12,
  },
};
const { Form, Row, Col } = libraries.Bootstrap;

export type Script = {
  label: string;
  path: string;
};
type Props = {
  value: string;
  defaultScript: string;
  onChange: (script: string) => Promise<void> | void;
  options: Script[];
};

const Funscripts = ({ value, onChange, options, defaultScript }: Props) => {
  const onInternalChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
    async (e) => {
      await onChange(e.target.value);
    },
    [onChange],
  );
  return (
    <>
      <dt
        style={{ lineHeight: '2.5em' }}
        id="stash-interactive-tools-label-funscripts"
      >
        Funscripts:
      </dt>
      <Row className="form-container" as="dd">
        <Col lg={7} xl={12}>
          <Form.Control
            as="select"
            id="stash-interactive-tools-select-funscripts"
            className="input-control"
            {...fullWidthProps.fieldProps}
            defaultValue={value}
            onChange={onInternalChange}
          >
            {!options.length && (
              <option value={defaultScript} key="default">
                Default
              </option>
            )}
            {options.map((entry) => (
              <option value={entry.path} key={entry.label}>
                {entry.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Row>
    </>
  );
};
export default Funscripts;
