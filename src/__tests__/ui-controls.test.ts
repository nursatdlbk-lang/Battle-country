// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BattleCreator } from '../ui/BattleCreator';
import { getBattleConfigFromStore, useStore } from '../ui/store';

vi.mock('../renderer/pixi-battle-renderer', () => ({
  PixiBattleRenderer: class {
    isReady = true;
    init = async () => {};
    preload = async () => {};
    render = () => {};
    destroy = () => {};
  },
}));
vi.mock('@remotion/player', () => ({ Player: () => React.createElement('div', null, 'Video player') }));

let host: HTMLDivElement;
let root: Root;
const initialStore = useStore.getState();
const clickButton = async (text: string) => {
  const button = [...host.querySelectorAll('button')].find(button => button.textContent?.includes(text));
  expect(button, `button ${text}`).toBeDefined();
  await act(async () => button!.click());
};
const continueToBattle = async () => {
  await clickButton('Продолжить к бою');
  expect(host.textContent).toContain('▶ Начать');
};

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useStore.setState({ ...initialStore, battleMode: 'free', aspectRatio: '1920x1080', maxDuration: 4 });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(BattleCreator))));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  useStore.setState(initialStore);
});

describe('live UI controls after StrictMode initialization', () => {
  it('switches settings tabs and toggles play/pause', async () => {
    await clickButton('Эффекты');
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Эффекты');
    expect(host.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);
    expect(host.textContent).not.toContain('▶ Начать');
    await continueToBattle();
    await clickButton('Начать');
    expect(useStore.getState().isPlaying).toBe(true);
    expect(host.textContent).toContain('Пауза');
    await clickButton('Пауза');
    expect(useStore.getState().isPlaying).toBe(false);
  });

  it('changes seed, restarts, opens and closes the render dialog', async () => {
    await continueToBattle();
    const seedBefore = useStore.getState().seed;
    vi.spyOn(Math, 'random').mockReturnValue(0.123456);
    await clickButton('Новый код');
    expect(useStore.getState().seed).not.toBe(seedBefore);
    expect(host.textContent).toContain('123456');
    vi.restoreAllMocks();
    await clickButton('Заново');
    await clickButton('Экспорт видео');
    expect(host.textContent).toContain('Video player');
    await clickButton('✕');
    expect(host.textContent).not.toContain('Video player');
  });
  it('changes the arena size used by preview and export independently of seed', async () => {
    await clickButton('Свободный бой');
    const seed = useStore.getState().seed;
    const selector = host.querySelector<HTMLSelectElement>('#arena-size')!;
    expect(selector.value).toBe('small');
    await act(async () => {
      selector.value = 'medium';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(useStore.getState().seed).toBe(seed);
    expect(getBattleConfigFromStore(useStore.getState()).arena).toMatchObject({ width: 1280, height: 720 });
    await continueToBattle();
    await clickButton('Экспорт видео');
    expect(host.textContent).toContain('1280 × 720');
  });

  it('commits independent physical field sliders without a display-only preview size control', async () => {
    await clickButton('Свободный бой');
    const widthRange = host.querySelector<HTMLInputElement>('#physical-arena-width-range')!;
    const heightRange = host.querySelector<HTMLInputElement>('#physical-arena-height-range')!;
    expect(host.textContent).toContain('Ширина физического поля');
    expect(host.textContent).toContain('Высота физического поля');
    expect(host.querySelector('#preview-size')).toBeNull();
    await act(async () => {
      widthRange.value = '800';
      widthRange.dispatchEvent(new Event('input', { bubbles: true }));
      widthRange.dispatchEvent(new Event('pointerup', { bubbles: true }));
    });
    expect(getBattleConfigFromStore(useStore.getState()).arena).toMatchObject({ width: 800, height: 540 });
    await act(async () => {
      heightRange.value = '800';
      heightRange.dispatchEvent(new Event('input', { bubbles: true }));
      heightRange.dispatchEvent(new Event('pointerup', { bubbles: true }));
    });
    expect(getBattleConfigFromStore(useStore.getState()).arena).toMatchObject({ width: 800, height: 800 });
  });

  it('supports square presets and commits a handle resize to the exported arena', async () => {
    await clickButton('Свободный бой');
    const selector = host.querySelector<HTMLSelectElement>('#arena-size')!;
    await act(async () => {
      selector.value = 'square';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(getBattleConfigFromStore(useStore.getState()).arena).toMatchObject({ width: 720, height: 720 });
    expect(host.querySelector<HTMLInputElement>('#arena-width')!.value).toBe('720');
    expect(host.querySelector<HTMLInputElement>('#arena-height')!.value).toBe('720');
    await continueToBattle();
    await clickButton('Начать');
    const handle = host.querySelector<HTMLButtonElement>('[aria-label="Изменить размер поля"]')!;
    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
    });
    expect(useStore.getState().arenaSize).toBe('custom');
    expect(useStore.getState().isPlaying).toBe(false);
    expect(getBattleConfigFromStore(useStore.getState()).arena).toMatchObject({ width: 740, height: 720 });
    await clickButton('Экспорт видео');
    expect(host.textContent).toContain('740 × 720');
  });

  it('uses selected arena dimensions for a tournament fight instead of silently forcing 1080 × 1920', async () => {
    expect(useStore.getState().battleMode).toBe('tournament');
    const width = host.querySelector<HTMLInputElement>('#physical-arena-width-range')!;
    const height = host.querySelector<HTMLInputElement>('#physical-arena-height-range')!;
    await act(async () => {
      width.value = '800'; width.dispatchEvent(new Event('input', { bubbles: true })); width.dispatchEvent(new Event('pointerup', { bubbles: true }));
      height.value = '1000'; height.dispatchEvent(new Event('input', { bubbles: true })); height.dispatchEvent(new Event('pointerup', { bubbles: true }));
    });
    expect(host.textContent).toContain('использует выбранный здесь физический размер поля');
    expect(getBattleConfigFromStore(useStore.getState()).arena).toMatchObject({ width: 800, height: 1000 });
    await continueToBattle();
    expect(host.textContent).toContain('800 × 1000');
  });

});
