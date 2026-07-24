import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLogs, saveLog, updateLog, deleteLog } from '../db/local-store';
import type { PizzaLog } from '../db/types';

export function usePizzaLogs() {
  return useQuery({
    queryKey: ['pizza-logs'],
    queryFn: getLogs,
  });
}

export function useRankedLogs(sortBy: 'moneyShot' | 'pizzaScore' | 'date' = 'moneyShot') {
  const { data: logs, ...rest } = usePizzaLogs();

  const sorted = logs
    ? [...logs].sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        if (sortBy === 'pizzaScore') {
          return (b.pizzaScore ?? -1) - (a.pizzaScore ?? -1);
        }
        return b.moneyShot - a.moneyShot;
      })
    : [];

  return { data: sorted, ...rest };
}

export function useSaveLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pizza-logs'] }),
  });
}

export function useUpdateLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pizza-logs'] }),
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pizza-logs'] }),
  });
}
