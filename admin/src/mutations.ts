import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hideContent, resolveReport, setUserRole, suspendUser, unsuspendUser, type SuspendInput } from './api';
import { useToast } from './components';
import { errorMessage } from './format';
import type { AppRole, ContentType } from './types';

function useModerationMutation<T>(
  mutationFn: (input: T) => Promise<void>,
  invalidate: string[],
  successMessage: string,
  failureMessage: string
) {
  const queryClient = useQueryClient();
  const showToast = useToast();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      [...invalidate, 'history'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      showToast(successMessage);
    },
    onError: (error) => showToast(errorMessage(failureMessage, error), true),
  });
}

export function useHideContent() {
  return useModerationMutation(
    ({ type, id, reason }: { type: ContentType; id: string; reason: string | null }) => hideContent(type, id, reason),
    ['reports'],
    'Conteúdo escondido.',
    'Não foi possível esconder o conteúdo.'
  );
}

export function useResolveReport() {
  return useModerationMutation(
    ({ id, status }: { id: string; status: 'dismissed' | 'actioned' }) => resolveReport(id, status),
    ['reports'],
    'Denúncia resolvida.',
    'Não foi possível resolver a denúncia.'
  );
}

export function useSuspendUser() {
  return useModerationMutation(suspendUser, ['suspensions'], 'Usuário suspenso.', 'Não foi possível suspender o usuário.');
}

type SuspendFromReportInput = SuspendInput & {
  reportId: string;
  content: { type: ContentType; id: string } | null;
};

async function suspendFromReport({ reportId, content, ...suspension }: SuspendFromReportInput): Promise<void> {
  if (content) await hideContent(content.type, content.id, suspension.reason);
  await suspendUser(suspension);
  if (!content) await resolveReport(reportId, 'actioned');
}

export function useSuspendFromReport() {
  return useModerationMutation(
    suspendFromReport,
    ['reports', 'suspensions'],
    'Autor suspenso e denúncia resolvida.',
    'Não foi possível concluir a suspensão.'
  );
}

export function useUnsuspendUser() {
  return useModerationMutation(unsuspendUser, ['suspensions'], 'Usuário reativado.', 'Não foi possível reativar o usuário.');
}

export function useSetUserRole() {
  return useModerationMutation(
    ({ userId, role }: { userId: string; role: AppRole | null }) => setUserRole(userId, role),
    ['roles'],
    'Papel atualizado.',
    'Não foi possível atualizar o papel.'
  );
}
