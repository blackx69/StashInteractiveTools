import './style.scss';
import { FunMapper } from 'funscript-utils';
import {
  LoggingSubscribeSubscription,
  RunPluginTaskMutationHookResult,
  SceneDataFragment,
} from './generated-graphql';
import {
  cloneElement,
  DetailedReactHTMLElement,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import Funscripts, { Script } from './Funscripts';
import StrokeSlider from './StrokeSlider';
import SyncSlider from './SyncSlider';
import { Action, FunscriptMetadata } from 'funscript-utils/src/types';
import { GQL, hooks, patch, React } from './api';

interface SceneFileInfoPanelProps {
  scene: SceneDataFragment;
}

const LOG_TAG = '[Plugin / Stash Interactive Tools]';

export type LogMessage = {
  scripts: Script[];
};

const canvas = document.createElement('canvas');
canvas.width = 1280;
canvas.height = 60;
const rootVars = document.documentElement;

type Funscript = {
  actions: Action[];
  metadata?: FunscriptMetadata;
  range: number;
};
function replaceHeatMap(url: string) {
  rootVars.style.setProperty(
    '--stash-interactive-tools-heatmap',
    `url(${url})`,
    'important',
  );
}

async function getScript(url: string) {
  return (await fetch(url).then((response) => response.json())) as Funscript;
}

async function generateHeatmap(url: string) {
  const script = await getScript(url);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  FunMapper.renderHeatmap(canvas, script, {
    background: 'rgba(255,255, 255, 0)',
  });
  replaceHeatMap(canvas.toDataURL('image/png'));
}

async function applyScriptChanges(url: string) {
  const script = await getScript(url);

  script.range = 100;

  return {
    blobUrl: (window.webkitURL || window.URL).createObjectURL(
      new Blob([JSON.stringify(script)], { type: 'text/plain' }),
    ),
    src: url,
  };
}

function findScripts(
  entries: LoggingSubscribeSubscription['loggingSubscribe'],
) {
  const entry = entries.find(
    (e) => e.message.includes(LOG_TAG) && e.message.includes('.funscript'),
  );
  if (!entry) return;
  return (
    JSON.parse(entry.message.replace(LOG_TAG, '').trim()) as LogMessage
  ).scripts?.reverse();
}

const InteractiveTools = ({ scene }: SceneFileInfoPanelProps) => {
  const [entries, setEntries] = useState<Script[]>([]);
  const [currentScript, setCurrentScript] = useState({
    blobUrl: scene.paths.funscript || '',
    src: scene.paths.funscript || '',
  });
  const { data: logs }: { data?: LoggingSubscribeSubscription } =
    GQL.useLoggingSubscribeSubscription();

  const [runPluginTaskMutation]: RunPluginTaskMutationHookResult =
    GQL.useRunPluginTaskMutation({
      variables: {
        plugin_id: 'StashInteractiveTools',
        task_name: 'init',
        args_map: {
          scene_id: scene.id,
        },
      },
    });

  const { uploadScript } = hooks.useInteractive();
  const onChange = useCallback(
    async (script: string) => {
      const lastKnownScript = currentScript;
      await applyScriptChanges(script);

      const newScript = await applyScriptChanges(script);
      await generateHeatmap(newScript.blobUrl);
      setCurrentScript(newScript);
      await uploadScript(newScript.blobUrl).catch(() => {
        if (scene.paths.interactive_heatmap) {
          replaceHeatMap(scene.paths.interactive_heatmap);
        }
        setCurrentScript(lastKnownScript);
      });
    },
    [setCurrentScript, uploadScript, currentScript, scene],
  );

  useEffect(() => {
    if (scene.paths.interactive_heatmap) {
      replaceHeatMap(scene.paths.interactive_heatmap);
    }
    runPluginTaskMutation().catch(console.error);
  }, [runPluginTaskMutation, scene]);

  useEffect(() => {
    if (!logs) return;
    const scripts = findScripts(logs.loggingSubscribe);
    if (!scripts) return;

    setEntries(scripts);
  }, [logs, setEntries]);

  return (
    <>
      <Funscripts
        value={currentScript.src}
        defaultScript={scene.paths.funscript || ''}
        onChange={onChange}
        options={entries}
      />
      <StrokeSlider />
      <SyncSlider />
    </>
  );
};

interface SceneFileInfoContainer {
  type: string;
  props?: {
    className?: string;
    children?: ReactNode | ReactNode[];
  };
}

function shouldInsertInto(el: unknown): el is SceneFileInfoContainer {
  if (typeof el !== 'object') return false;
  if (el?.type !== 'dl') return false;
  return el?.props?.className?.includes('scene-file-info');
}

patch.after(
  'SceneFileInfoPanel',
  (
    props: PropsWithChildren<SceneFileInfoPanelProps>,
    a: unknown,
    results: { props: { children: ReactNode | ReactNode[] } },
  ) => {
    return [
      ...React.Children.map(
        React.Children.toArray(results.props.children),
        (child) => {
          if (!shouldInsertInto(child)) return child;
          const { children, ...restProps } = child.props;

          return cloneElement(
            child as DetailedReactHTMLElement<object, HTMLDListElement>,

            {
              ...restProps,
              className: `${restProps.className} stash-interactive-tools`,
            },
            React.Children.map(children, (inner) => {
              if (inner?.props?.name === 'Funscript')
                return <InteractiveTools scene={props.scene} />;
              return inner;
            }),
          );
        },
      ),
    ];
  },
);
