import { act, render, screen } from '@testing-library/react';
import type { SyncAccount } from './syncAccount';
import { SyncProvider, useSync } from './SyncProvider';
import type { SyncEngine, SyncState } from './syncEngine';

function Probe() {
  const sync = useSync();
  return <output data-testid="sync-state">{sync ? `${sync.configured}:${sync.state.status}` : 'none'}</output>;
}

function setup(initial: SyncState = { status: 'idle', email: 'person@example.com' }) {
  let listener: ((state: SyncState) => void) | undefined;
  const unsubscribe = vi.fn();
  const engine = {
    getState: vi.fn(() => initial),
    subscribe: vi.fn((fn: (state: SyncState) => void) => {
      listener = fn;
      return unsubscribe;
    }),
    start: vi.fn(),
    stop: vi.fn(),
    requestSync: vi.fn(),
    syncNow: vi.fn().mockResolvedValue(undefined),
    whenIdle: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
  } satisfies SyncEngine;
  const account = {} as SyncAccount;
  return { engine, account, unsubscribe, notify: (state: SyncState) => listener?.(state) };
}

describe('SyncProvider', () => {
  it('renders children and exposes then updates the engine state', () => {
    const { engine, account, notify } = setup();
    render(
      <SyncProvider engine={engine} account={account}>
        <Probe />
      </SyncProvider>,
    );

    expect(screen.getByTestId('sync-state')).toHaveTextContent('true:idle');
    act(() => notify({ status: 'syncing', email: 'person@example.com' }));
    expect(screen.getByTestId('sync-state')).toHaveTextContent('true:syncing');
    expect(engine.start).toHaveBeenCalledTimes(1);
  });

  it('requests sync when the app becomes active and when the browser comes online', () => {
    const { engine, account } = setup();
    render(
      <SyncProvider engine={engine} account={account}>
        <Probe />
      </SyncProvider>,
    );

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(engine.requestSync).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => window.dispatchEvent(new Event('online')));
    expect(engine.requestSync).toHaveBeenNthCalledWith(1, 'foreground');
    expect(engine.requestSync).toHaveBeenNthCalledWith(2, 'online');
  });

  it('unsubscribes and removes its listeners without permanently stopping the engine', () => {
    const { engine, account, unsubscribe } = setup();
    const view = render(
      <SyncProvider engine={engine} account={account}>
        <Probe />
      </SyncProvider>,
    );

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(engine.stop).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event('online')));
    expect(engine.requestSync).not.toHaveBeenCalled();
  });

  it('returns null outside a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('sync-state')).toHaveTextContent('none');
  });
});
