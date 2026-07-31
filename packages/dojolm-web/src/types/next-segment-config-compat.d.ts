// SPDX-License-Identifier: Apache-2.0
import 'next/dist/build/segment-config/app/app-segment-config.js';

declare module 'next/dist/build/segment-config/app/app-segment-config.js' {
  export type PrefetchForTypeCheckInternal = InstantConfigForTypeCheckInternal;
}

export {};
