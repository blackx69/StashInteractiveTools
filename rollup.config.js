// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import scss from 'rollup-plugin-scss';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import copy from 'rollup-plugin-copy';

import 'dotenv/config';
import fg from 'fast-glob';

const packageJson = require('./package.json');
const plugins = [
  peerDepsExternal(),
  resolve(),
  commonjs(),
  typescript({ tsconfig: './tsconfig.json' }),
  terser(),
  copy({
    targets: [
      {
        src: 'assets/**',
        dest: 'dist/cjs/',
      },
    ],
  }),
  scss({}), //
];

export default [
  {
    input: 'src/index.tsx',
    output: [
      {
        banner: `window.require = function (name) {
  if (name === "react") return window.PluginApi.React;
  if(name ==='global/window') return window;
  if(name ==='global/document') return window.document;
  if(name ==='video.js') return window.PluginApi.libraries.videojs;
};
`,
        file: packageJson.main,
        format: 'cjs',
        sourcemap: process.env.NODE_ENV !== 'production',
        sourcemapBaseUrl:
          'http://localhost:9999/plugin/StashInteractiveTools/assets/',
      },
    ],
    plugins,

    external: ['react', 'react-dom', 'thehandy', 'video.js'],
  },
];
