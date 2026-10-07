import React from 'react';
import { NewInvoiceView } from '../invoices/NewInvoiceView';

export const NewProformaInvoiceView: React.FC = () => {
  return <NewInvoiceView isProforma={true} />;
};

