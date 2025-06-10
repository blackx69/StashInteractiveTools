import { libraries, React, GQL } from '../api';
import {
  SceneDataFragment,
  useRunPluginOperationMutation,
} from '../generated-graphql';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Script } from '../components';
import { Action, FunscriptMetadata } from 'funscript-utils/src/types';
import { FunMapper } from 'funscript-utils';
import { deepMerge } from '../deepMerge';

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
export type InteractiveContext = {
  scene: SceneDataFragment;
  currentPaths: ScenePaths;
  defaultPaths: ScenePaths;
  entries: Script[];
  onChange: (script: string) => Promise<void>;
};
const InteractiveToolsContext = React.createContext<InteractiveContext>(
  {} as InteractiveContext,
);

type Props = React.PropsWithChildren<{
  scene: SceneDataFragment;
}>;
type ScenePaths = {
  blobUrl?: string | null;
  src?: string | null;
  heatMap?: string | null;
};

export const InteractiveToolsProvider = ({ scene, children }: Props) => {
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
          origin: window.location.origin,
        },
      },
    }).catch(console.error);
  }, [findScripts, scene]);

  useEffect(() => {
    setEntries(data?.runPluginOperation?.scripts ?? []);
  }, [data]);
  const contextValue = useMemo(
    () => ({
      entries,
      onChange,
      currentPaths,
      defaultPaths,
      scene,
    }),
    [entries, onChange, currentPaths, defaultPaths, scene],
  );
  return (
    <InteractiveToolsContext.Provider value={contextValue}>
      {children}
    </InteractiveToolsContext.Provider>
  );
};

export const useInteractiveTools = () => {
  return React.useContext(InteractiveToolsContext);
};
