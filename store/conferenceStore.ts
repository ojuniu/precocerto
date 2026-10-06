import { create } from 'zustand';
import {
  checkReceipt,
  confirmMatch,
  linkManually,
  loadConference,
  rejectMatch,
  type Conference,
} from '@/services/comparison/conferenceService';
import { setDivergenceConfirmed } from '@/services/data/matchRepository';
import { toUserMessage } from '@/utils/errors';

export type ReceiptStage = 'reading' | 'matching' | 'saving';

interface ConferenceState {
  conference: Conference | null;
  loading: boolean;
  stage: ReceiptStage | null;
  error: string | null;
  load: (shoppingId: string) => Promise<void>;
  processReceipt: (shoppingId: string, photo: { uri: string; width?: number }) => Promise<Conference>;
  confirm: (matchId: string) => Promise<void>;
  reject: (matchId: string) => Promise<void>;
  link: (shoppingItemId: string, receiptItemId: string) => Promise<void>;
  toggleDivergence: (matchId: string, confirmed: boolean) => Promise<void>;
}

export const useConferenceStore = create<ConferenceState>((set, get) => {
  const shoppingId = () => {
    const id = get().conference?.shopping.id;
    if (!id) throw new Error('Conferência não carregada.');
    return id;
  };

  const run = async (action: () => Promise<Conference>) => {
    set({ loading: true, error: null });
    try {
      const conference = await action();
      set({ conference, loading: false });
    } catch (error) {
      set({ loading: false, error: toUserMessage(error) });
      throw error;
    }
  };

  return {
    conference: null,
    loading: false,
    stage: null,
    error: null,

    load: async (id) => {
      if (get().conference?.shopping.id !== id) set({ conference: null });
      await run(async () => {
        const fresh = await loadConference(id);
        const previous = get().conference;
        // Mantém os avisos da leitura recém-feita (eles não são persistidos).
        return previous?.shopping.id === id ? { ...fresh, warnings: previous.warnings } : fresh;
      }).catch(() => undefined);
    },

    processReceipt: async (id, photo) => {
      set({ error: null, stage: 'reading' });
      try {
        const conference = await checkReceipt(id, photo, (stage) => set({ stage }));
        set({ conference, stage: null });
        return conference;
      } catch (error) {
        set({ stage: null, error: toUserMessage(error) });
        throw error;
      }
    },

    confirm: (matchId) => run(() => confirmMatch(shoppingId(), matchId)),
    reject: (matchId) => run(() => rejectMatch(shoppingId(), matchId)),
    link: (itemId, receiptItemId) => run(() => linkManually(shoppingId(), itemId, receiptItemId)),

    toggleDivergence: async (matchId, confirmed) => {
      await setDivergenceConfirmed(matchId, confirmed);
      const conference = get().conference;
      if (!conference) return;
      const matches = conference.matches.map((m) => (m.id === matchId ? { ...m, divergenceConfirmed: confirmed } : m));
      const summary = conference.summary && {
        ...conference.summary,
        lines: conference.summary.lines.map((line) =>
          line.match?.id === matchId ? { ...line, match: { ...line.match, divergenceConfirmed: confirmed } } : line,
        ),
      };
      set({ conference: { ...conference, matches, summary } });
    },
  };
});
