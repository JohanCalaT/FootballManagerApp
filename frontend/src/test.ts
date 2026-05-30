// Loaded by Karma. Production code runs zoneless, but the test harness still
// uses zone.js for compatibility with TestBed (this is the supported pattern
// for Angular 20 + Karma until @angular/core/testing exposes a zoneless API).
import 'zone.js';
import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
