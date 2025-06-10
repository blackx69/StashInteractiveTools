import './style.scss';

import { SceneDataFragment } from './generated-graphql';
import { PropsWithChildren } from 'react';
import { InteractiveToolsTab } from './components';
import { libraries, patch, React } from './api';

const { Nav, Tab } = libraries.Bootstrap;
const { FormattedMessage } = libraries.Intl;

interface SceneFileInfoPanelProps {
  scene: SceneDataFragment;
}

patch.after('ScenePage.Tabs', (props: PropsWithChildren) => {
  return (
    <>
      {props.children}
      <Nav.Item>
        <Nav.Link eventKey="scene-interactive-panel">
          <FormattedMessage
            id="actions.interactive.edit"
            defaultMessage="Interactive"
          />
        </Nav.Link>
      </Nav.Item>
    </>
  );
});

patch.after(
  'ScenePage.TabContent',
  (props: PropsWithChildren<SceneFileInfoPanelProps>) => {
    return (
      <>
        {props.children}
        <Tab.Pane
          eventKey="scene-interactive-panel"
          className="stash-interactive-tools-tab"
        >
          <InteractiveToolsTab scene={props.scene} />
        </Tab.Pane>
      </>
    );
  },
);
