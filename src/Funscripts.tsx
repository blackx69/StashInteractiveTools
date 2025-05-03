import { ChangeEventHandler, useCallback, useState } from 'react';
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
  defaultComponent: React.JSX.Element;
  options: Script[];
};

const Funscripts = ({
  value,
  onChange,
  options,
  defaultScript,
  defaultComponent,
}: Props) => {
  const [selected, setSelected] = useState(value || defaultScript);
  const onInternalChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
    async (e) => {
      setSelected(e.target.value);
      await onChange(e.target.value);
    },
    [onChange, setSelected],
  );
  return options.length > 1 ? (
    <>
      <dt
        style={{ lineHeight: '2.5em' }}
        id="stash-interactive-tools-label-funscripts"
      >
        Scripts:
      </dt>
      <Row className="form-container" as="dd">
        <Col lg={11} xl={11}>
          <Form.Control
            as="select"
            id="stash-interactive-tools-select-funscripts"
            className="input-control"
            {...fullWidthProps.fieldProps}
            value={selected}
            defaultValue={selected}
            onChange={onInternalChange}
          >
            {options.map((entry) => (
              <option value={entry.path} key={entry.label}>
                {entry.label}
              </option>
            ))}
          </Form.Control>
        </Col>
      </Row>
    </>
  ) : (
    defaultComponent
  );
};
export default Funscripts;
