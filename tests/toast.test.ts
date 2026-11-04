import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { toast, getActiveToastCount } from '../src/utils/toast';

describe('toast lifecycle', () => {
  afterEach(() => {
    toast.dismiss();
    mock.timers.reset();
  });

  it('closes and removes a toast after its duration (even a long one)', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    toast.dismiss();
    mock.timers.tick(1000);
    const base = getActiveToastCount();

    toast.warning('Invoice generated, but the initial payment failed.', { duration: 8000 });
    assert.equal(getActiveToastCount(), base + 1);

    mock.timers.tick(7999);
    assert.equal(getActiveToastCount(), base + 1); // still on screen just before the deadline

    mock.timers.tick(1); // auto-hide fires; the exit animation then runs
    mock.timers.tick(400);
    assert.equal(getActiveToastCount(), base); // fully removed
  });

  it('uses a 4 second default and removes it', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const base = getActiveToastCount();
    toast.success('Saved');
    mock.timers.tick(4000); // auto-hide fires
    mock.timers.tick(400); // exit animation, then removed
    assert.equal(getActiveToastCount(), base);
  });

  it('keeps a loading toast until it is replaced, then closes the replacement', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const base = getActiveToastCount();
    toast.loading('Preparing PDF...', { id: 'pdf' });
    mock.timers.tick(60_000);
    assert.equal(getActiveToastCount(), base + 1); // loading never times out on its own

    toast.success('Downloaded', { id: 'pdf' }); // same id: replaced in place
    assert.equal(getActiveToastCount(), base + 1);
    mock.timers.tick(4000); // auto-hide fires
    mock.timers.tick(400); // exit animation, then removed
    assert.equal(getActiveToastCount(), base);
  });

  it('dismiss removes a toast right away (after the exit animation)', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const base = getActiveToastCount();
    const id = toast.info('Hello', { duration: 60_000 });
    toast.dismiss(id);
    mock.timers.tick(400);
    assert.equal(getActiveToastCount(), base);
  });
});
