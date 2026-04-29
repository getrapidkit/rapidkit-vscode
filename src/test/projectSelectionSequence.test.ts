import { describe, expect, it } from 'vitest';

import { ProjectSelectionSequence } from '../ui/panels/projectSelectionSequence';

describe('ProjectSelectionSequence', () => {
  it('keeps only the most recent selection active', () => {
    const sequence = new ProjectSelectionSequence();

    const first = sequence.begin();
    const second = sequence.begin();

    expect(sequence.isCurrent(first)).toBe(false);
    expect(sequence.isCurrent(second)).toBe(true);
  });

  it('invalidates in-flight work after a later reset', () => {
    const sequence = new ProjectSelectionSequence();

    const active = sequence.begin();
    sequence.begin();

    expect(sequence.isCurrent(active)).toBe(false);
  });
});
