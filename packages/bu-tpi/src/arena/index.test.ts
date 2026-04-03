import { describe, it, expect } from 'vitest';
import * as mod from '../arena/index.js';

describe('arena exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports sandbox and environment functions', () => {
    expect(mod.createSandbox).toBeTypeOf('function');
    expect(mod.createEnvironment).toBeTypeOf('function');
    expect(mod.resetEnvironment).toBeTypeOf('function');
  });

  it('exports match runner and game mode symbols', () => {
    expect(mod.createMatch).toBeTypeOf('function');
    expect(mod.runMatch).toBeTypeOf('function');
    expect(mod.ALL_GAME_MODES).toBeDefined();
    expect(mod.getGameMode).toBeTypeOf('function');
  });
});
