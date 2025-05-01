import './style.scss';
import { FunMapper } from 'funscript-utils';
import {
  SceneDataFragment,
  useRunPluginOperationMutation,
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
import { GQL, libraries, patch, React } from './api';
import { deepMerge } from './deepMerge';

interface SceneFileInfoPanelProps {
  scene: SceneDataFragment;
}

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
  return canvas.toDataURL('image/png');
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

/*
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
}    */

type ScenePaths = {
  blobUrl?: string | null;
  src?: string | null;
  heatMap?: string | null;
};

const InteractiveTools = ({ scene }: SceneFileInfoPanelProps) => {
  const [entries, setEntries] = useState<Script[]>([]);
  const [currentPaths, setCurrentPaths] = useState<ScenePaths>({
    blobUrl: scene.paths.funscript || '',
    src: scene.paths.funscript || '',
    heatMap: scene.paths.interactive_heatmap,
  });
  const client = libraries.Apollo.useApolloClient();
  const [defaultPaths] = useState<ScenePaths>({
    blobUrl: scene.paths.funscript,
    src: scene.paths.funscript,
    heatMap: scene.paths.interactive_heatmap,
  });

  const [findScripts, { data }] = useRunPluginOperationMutation<{
    scripts: Script[];
  }>();

  //const { uploadScript } = hooks.useInteractive();
  const onChange = useCallback(
    async (script: string) => {
      let newPaths: ScenePaths = defaultPaths;
      if (currentPaths.src !== script) {
        const changes = await applyScriptChanges(script);
        const heatMap = await generateHeatmap(changes.blobUrl);
        newPaths = {
          ...changes,
          heatMap,
        };
      }

      client.writeQuery({
        query: GQL.FindSceneDocument,
        data: {
          findScene: deepMerge({}, scene, {
            paths: {
              funscript: newPaths.blobUrl,
              interactive_heatmap: newPaths.heatMap,
            },
          }),
        },
        variables: {
          id: scene.id,
        },
      });

      setCurrentPaths(newPaths);
    },
    [setCurrentPaths, currentPaths, scene, client, defaultPaths],
  );

  useEffect(() => {
    if (scene.paths.interactive_heatmap) {
      replaceHeatMap(scene.paths.interactive_heatmap);
    }
    findScripts({
      variables: {
        plugin_id: 'StashInteractiveTools',
        args: {
          mode: 'init',
          scene_id: scene.id,
          hostname: window.location.hostname,
        },
      },
    }).catch(console.error);
  }, [findScripts, scene]);

  useEffect(() => {
    setEntries(data?.runPluginOperation?.scripts ?? []);
  }, [data]);

  return (
    <>
      <Funscripts
        value={currentPaths.src || ''}
        defaultScript={defaultPaths.src || ''}
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shouldInsertInto(el: any): el is SceneFileInfoContainer {
  if (typeof el !== 'object') return false;
  if ('type' in el && el?.type !== 'dl') return false;
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
