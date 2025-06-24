import './style.scss';

import { SceneDataFragment } from './generated-graphql';
import React, { PropsWithChildren } from 'react';
import { InteractiveToolsTab } from './components';
import { Nav, Tab } from 'react-bootstrap';
import { patch } from './api';

interface SceneFileInfoPanelProps {
  scene: SceneDataFragment;
}

patch.after('ScenePage.Tabs', (props: PropsWithChildren) => {
  return (
    <>
      {props.children}
      <Nav.Item>
        <Nav.Link eventKey="scene-interactive-panel">Interactive</Nav.Link>
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
