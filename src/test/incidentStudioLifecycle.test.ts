import { describe, expect, it } from 'vitest';

import {
  getConversationIdToCloseOnBootstrap,
  getConversationIdToCloseOnViewExit,
} from '../../webview-ui/src/lib/incidentStudioLifecycle';

describe('incidentStudioLifecycle', () => {
  it('closes the previous conversation when incident studio re-bootstrap creates a new one', () => {
    expect(getConversationIdToCloseOnBootstrap('conv-active', 'conv-next')).toBe('conv-active');
  });

  it('does not close anything when bootstrap reuses the same conversation or there is no active one', () => {
    expect(getConversationIdToCloseOnBootstrap('conv-active', 'conv-active')).toBeNull();
    expect(getConversationIdToCloseOnBootstrap(null, 'conv-next')).toBeNull();
  });

  it('closes the active conversation when leaving incident studio and keeps it while staying inside the view', () => {
    expect(getConversationIdToCloseOnViewExit('dashboard', 'conv-active')).toBe('conv-active');
    expect(getConversationIdToCloseOnViewExit('incident-studio', 'conv-active')).toBeNull();
    expect(getConversationIdToCloseOnViewExit('dashboard', null)).toBeNull();
  });
});
