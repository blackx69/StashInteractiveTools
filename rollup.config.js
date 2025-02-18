// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import scss from 'rollup-plugin-scss';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import zip from 'rollup-plugin-zip';

import 'dotenv/config';

const prod = process.env.NODE_ENV === 'production';
const plugins = [
  peerDepsExternal(),
  resolve(),
  commonjs(),
  typescript({ tsconfig: './tsconfig.json' }),
  terser(),
  json(),
  copy({
    targets: [
      {
        src: 'assets/**',
        dest: 'dist/',
      },
    ],
  }),
  scss({
    output: 'dist/index.css',
  }), //
];

if (prod) {
  plugins.push(zip({ file: 'StashInteractiveTools.zip' }));
}

export default [
  {
    input: 'src/index.tsx',
    cache: prod,
    output: [
      {
        banner: `window.require = function (name) {
  if (name === "react") return window.PluginApi.React;
  if(name ==='global/window') return window;
  if(name ==='global/document') return window.document;
  if(name ==='video.js') return window.PluginApi.libraries.videojs;
};
`,
        //file: packageJson.main,
        dir: './dist',
        format: 'cjs',
        sourcemap: !prod,
        sourcemapBaseUrl: !prod
          ? 'http://localhost:9999/plugin/StashInteractiveTools/assets/'
          : '',
      },
    ],
    plugins,

    external: ['react', 'react-dom', 'thehandy', 'video.js'],
  },
];
