import React, { useCallback, useState } from 'react';
import { StatusChangeModal } from '../../../components/common/StatusChangeModal';

export interface StatusConfirmRequest {
  /** Record type shown in the title, e.g. "Customer" -> "Deactivate Customer". */
  itemTypeLabel: string;
  /** Record name shown in bold in the message. */
  itemName?: string;
  /** Status the record will move to when confirmed. */
  nextStatus: 'Active' | 'Inactive';
  /** Runs the existing status-change handler once the user confirms. */
  run: () => Promise<unknown> | unknown;
}

/**
 * Shared "Are you sure you want to mark X as Inactive/Active?" dialog (app Modal theme, like Delete) for the
 * Active / Inactive row actions in the sale-management modules.
 *
 *   const { requestStatusChange, statusConfirmModal } = useStatusConfirm();
 *   onClick: () => requestStatusChange({ itemTypeLabel: 'Customer', itemName: c.name, nextStatus: 'Inactive', run: () => update(c) })
 *   ...render {statusConfirmModal} once in the screen.
 */
export const useStatusConfirm = () => {
  const [request, setRequest] = useState<StatusConfirmRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestStatusChange = useCallback((req: StatusConfirmRequest) => setRequest(req), []);

  const handleClose = () => {
    if (!isLoading) setRequest(null);
  };

  const handleConfirm = async () => {
    if (!request || isLoading) return;
    setIsLoading(true);
    try {
      await request.run();
    } finally {
      setIsLoading(false);
      setRequest(null);
    }
  };

  const statusConfirmModal = (
    <StatusChangeModal
      isOpen={!!request}
      onClose={handleClose}
      onConfirm={handleConfirm}
      nextStatus={request?.nextStatus ?? 'Inactive'}
      entityName={request?.itemTypeLabel ?? 'Record'}
      recordName={request?.itemName}
      isLoading={isLoading}
    />
  );

  return { requestStatusChange, statusConfirmModal };
};
