import { Config } from '@stencil/core';

// FootballManager Web Components — Stencil 4 configuration.
//
// Output targets:
//   - dist-custom-elements:  modern bundle Angular consumes via
//                            `import { defineCustomElements } from
//                            '@football-manager/stencil/loader'`.
//   - dist:                  legacy collection + ESM, kept for safety.
//   - www:                   dev-server-friendly output. `npm start`
//                            inside frontend/stencil opens
//                            http://localhost:3333 against src/index.html
//                            which has hardcoded fixtures for previewing.
export const config: Config = {
  namespace: 'football-manager-stencil',
  outputTargets: [
    {
      type: 'dist-custom-elements',
      externalRuntime: false,
      generateTypeDeclarations: true,
    },
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'www',
      serviceWorker: null,
    },
  ],
  testing: {
    browserHeadless: 'shell',
  },
};
