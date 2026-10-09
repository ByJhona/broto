import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applyPenalty, hideContent, resolveReports, revokePenalty, setUserRole, type PenaltyInput } from './api';
import { useToast } from './components';
import { errorMessage } from './format';
import type { AppRole, ContentType, Penalty } from './types';

const MODERATION_QUERIES = ['reports', 'penalties', 'history'];

function useModerationMutation<T>(
  mutationFn: (input: T) => Promise<void>,
  successMessage: string,
  failureMessage: string,
  invalidate: string[] = MODERATION_QUERIES
) {
  const queryClient = useQueryClient();
  const showToast = useToast();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      showToast(successMessage);
    },
    onError: (error) => showToast(errorMessage(failureMessage, error), true),
  });
}

export function useHideContent() {
  return useModerationMutation(
    ({ type, id, reason }: { type: ContentType; id: string; reason: string | null }) => hideContent(type, id, reason),
    'Conteúdo removido e denúncias resolvidas.',
    'Não foi possível remover o conteúdo.'
  );
}

export function useResolveReports() {
  return useModerationMutation(
    ({ ids, status }: { ids: string[]; status: 'dismissed' | 'actioned' }) => resolveReports(ids, status),
    'Denúncias atualizadas.',
    'Não foi possível atualizar as denúncias.'
  );
}

type PenaltyWithContent = PenaltyInput & { hide: { type: ContentType; id: string } | null };

async function applyPenaltyWithContent({ hide, ...penalty }: PenaltyWithContent): Promise<void> {
  if (hide) await hideContent(hide.type, hide.id, penalty.reason);
  await applyPenalty(penalty);
}

export function useApplyPenalty() {
  return useModerationMutation(applyPenaltyWithContent, 'Penalidade aplicada.', 'Não foi possível aplicar a penalidade.');
}

export function useRevokePenalty() {
  return useModerationMutation((penalty: Penalty) => revokePenalty(penalty), 'Penalidade removida.', 'Não foi possível remover a penalidade.');
}

export function useSetUserRole() {
  return useModerationMutation(
    ({ userId, role }: { userId: string; role: AppRole | null }) => setUserRole(userId, role),
    'Papel atualizado.',
    'Não foi possível atualizar o papel.',
    ['roles', 'history']
  );
}
