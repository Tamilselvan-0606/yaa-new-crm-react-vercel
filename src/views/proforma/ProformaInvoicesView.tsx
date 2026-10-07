import React from 'react';
import { InvoicesView } from '../invoices/InvoicesView';

export const ProformaInvoicesView: React.FC = () => {
  return <InvoicesView isProforma={true} />;
};

