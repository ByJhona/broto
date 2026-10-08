import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';
import { BLOCKED_USERS_QUERY_KEY, blockUser, getBlockedUsers, reportContent, unblockUser } from '@/services';
import { CONTENT_REPORT_REASONS, type ContentReportReason, type ContentReportTarget } from '@/types';
import { ActionSheet, type AlertButton, confirm, Toast } from '@/utils';

export type ModerationTargetUser = { id: string; name: string };

export function useBlockedUsers(enabled = true) {
  return useQuery({ queryKey: BLOCKED_USERS_QUERY_KEY, queryFn: getBlockedUsers, enabled });
}

export function useModerationActions() {
  const { t } = useTranslation(['moderation', 'common']);
  const queryClient = useQueryClient();
  const cancelButton: AlertButton = { text: t('common:cancel'), style: 'cancel' };

  const submitReport = async (target: ContentReportTarget, reason: ContentReportReason) => {
    try {
      await reportContent(target, reason);
      Toast.success(t('reportSuccess'));
    } catch (err) {
      console.error(err);
      Toast.error(t('reportError'));
    }
  };

  const openReport = (target: ContentReportTarget) =>
    ActionSheet.show(t('reportReasonTitle'), [
      ...CONTENT_REPORT_REASONS.map((reason) => ({
        text: t(`reportReason.${reason}`),
        onPress: () => submitReport(target, reason),
      })),
      cancelButton,
    ]);

  const confirmBlock = async (user: ModerationTargetUser): Promise<boolean> => {
    const confirmed = await confirm(t('blockTitle', { name: user.name }), t('blockMessage', { name: user.name }), {
      confirmLabel: t('blockConfirm'),
      destructive: true,
    });
    if (!confirmed) return false;
    try {
      await blockUser(user.id);
      await queryClient.invalidateQueries();
      Toast.success(t('blockSuccess', { name: user.name }));
      return true;
    } catch (err) {
      console.error(err);
      Toast.error(t('blockError'));
      return false;
    }
  };

  const unblock = async (user: ModerationTargetUser) => {
    try {
      await unblockUser(user.id);
      await queryClient.invalidateQueries();
      Toast.success(t('unblockSuccess', { name: user.name }));
    } catch (err) {
      console.error(err);
      Toast.error(t('unblockError'));
    }
  };

  const reportButton = (target: ContentReportTarget, label: string): AlertButton => ({
    text: label,
    style: 'destructive',
    onPress: () => openReport(target),
  });

  const blockButton = (user: ModerationTargetUser, onBlocked?: () => void): AlertButton => ({
    text: t('blockAction', { name: user.name }),
    style: 'destructive',
    onPress: async () => {
      if (await confirmBlock(user)) onBlocked?.();
    },
  });

  const openUserActions = (user: ModerationTargetUser, extraButtons: AlertButton[] = [], onBlocked?: () => void) =>
    ActionSheet.show(t('userActionsTitle', { name: user.name }), [
      ...extraButtons,
      reportButton({ type: 'user', id: user.id }, t('reportUserAction')),
      blockButton(user, onBlocked),
      cancelButton,
    ]);

  const openProfileActions = (user: ModerationTargetUser, isBlocked: boolean, onBlocked?: () => void) => {
    if (!isBlocked) {
      openUserActions(user, [], onBlocked);
      return;
    }
    ActionSheet.show(t('userActionsTitle', { name: user.name }), [
      { text: t('unblockAction', { name: user.name }), onPress: () => unblock(user) },
      reportButton({ type: 'user', id: user.id }, t('reportUserAction')),
      cancelButton,
    ]);
  };

  return { cancelButton, openReport, reportButton, blockButton, unblock, openUserActions, openProfileActions };
}
