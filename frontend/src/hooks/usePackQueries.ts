import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { packService } from '@/services/pack.service';
import type { AssignPackPayload, TopUpAlbumScansPayload } from '@/types/pack.types';

export const packKeys = {
  all: ['packs'] as const,
  adminList: () => [...packKeys.all, 'admin'] as const,
  ledger: (studioId?: string) => [...packKeys.all, 'ledger', studioId ?? 'all'] as const,
  studioAdmin: (studioId: string) => [...packKeys.all, 'studio-admin', studioId] as const,
  studioSummary: () => [...packKeys.all, 'studio-summary'] as const,
  studioCredits: () => [...packKeys.all, 'studio-credits'] as const,
  studioHistory: () => [...packKeys.all, 'studio-history'] as const,
};

export const useAdminPacksQuery = () =>
  useQuery({
    queryKey: packKeys.adminList(),
    queryFn: () => packService.getAdminPacks(),
  });

export const usePackLedgerQuery = (studioId?: string) =>
  useQuery({
    queryKey: packKeys.ledger(studioId),
    queryFn: () => packService.getLedger({ studioId, limit: 50 }),
  });

export const useAdminStudioPackSummaryQuery = (studioId: string) =>
  useQuery({
    queryKey: packKeys.studioAdmin(studioId),
    queryFn: () => packService.getStudioCredits(studioId),
    enabled: Boolean(studioId),
  });

export const useAssignPackMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignPackPayload) => packService.assignPack(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: packKeys.studioAdmin(variables.studioId) });
      void queryClient.invalidateQueries({ queryKey: packKeys.ledger(variables.studioId) });
      void queryClient.invalidateQueries({ queryKey: packKeys.ledger() });
    },
  });
};

export const useTopUpScansMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TopUpAlbumScansPayload) => packService.topUpScans(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
  });
};

export const useStudioPackSummaryQuery = () =>
  useQuery({
    queryKey: packKeys.studioSummary(),
    queryFn: () => packService.getStudioSummary(),
  });

export const useStudioPackCreditsQuery = () =>
  useQuery({
    queryKey: packKeys.studioCredits(),
    queryFn: () => packService.getStudioCreditsList(),
  });

export const useStudioPackHistoryQuery = () =>
  useQuery({
    queryKey: packKeys.studioHistory(),
    queryFn: () => packService.getStudioHistory(),
  });
