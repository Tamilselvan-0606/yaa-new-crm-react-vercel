import React, { useState, useEffect, useRef } from 'react';
import { Forward, Share2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Universal Share Options Payload
 */
export interface SharePayload {
  title?: string;
  subject: string;
  body: string;
  recipientEmail?: string;
  recipientPhone?: string;
  whatsAppText?: string;
}

/**
 * Google Gmail multi-colored Vector Icon
 */
export const GmailIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z"
      fill="#EA4335"
      fillOpacity="0.12"
    />
    <path
      d="M20 4H4C2.9 4 2 4.9 2 6V6.5L12 13L22 6.5V6C22 4.9 21.1 4 20 4Z"
      fill="#EA4335"
    />
    <path
      d="M2 6.5V18C2 19.1 2.9 20 4 20H5V8.5L2 6.5Z"
      fill="#4285F4"
    />
    <path
      d="M22 6.5V18C22 19.1 21.1 20 20 20H19V8.5L22 6.5Z"
      fill="#34A853"
    />
    <path
      d="M19 20H5V8.5L12 13L19 8.5V20Z"
      fill="#FBBC04"
      fillOpacity="0.25"
    />
    <path
      d="M20 6L12 11.5L4 6H20Z"
      fill="#C5221F"
    />
  </svg>
);

/**
 * Official WhatsApp Green Vector Icon
 */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-white fill-white' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

/**
 * Direct Gmail Share Trigger
 * Opens Gmail Web composer or falls back to system mailto
 */
export const shareOnGmail = ({
  subject,
  body,
  to = '',
  title = 'record',
}: {
  subject: string;
  body: string;
  to?: string;
  title?: string;
}): void => {
  const encTo = encodeURIComponent(to.trim());
  const encSubject = encodeURIComponent(subject.trim());
  const encBody = encodeURIComponent(body.trim());

  // Gmail Web Composer URL
  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSubject}&body=${encBody}`;
  
  const win = window.open(gmailWebUrl, '_blank', 'noopener,noreferrer');
  if (!win) {
    // Fallback to mailto if popup blocker blocked new tab
    window.location.href = `mailto:${to}?subject=${encSubject}&body=${encBody}`;
  }
  toast.success(`Opening Gmail to share ${title}`);
};

/**
 * Direct WhatsApp Share Trigger
 * Normalizes phone and opens WhatsApp Web/App
 */
export const shareOnWhatsApp = ({
  text,
  phone = '',
  title = 'record',
}: {
  text: string;
  phone?: string;
  title?: string;
}): void => {
  const encText = encodeURIComponent(text.trim());
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  let waUrl = `https://api.whatsapp.com/send?text=${encText}`;
  if (cleanPhone) {
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encText}`;
  }

  window.open(waUrl, '_blank', 'noopener,noreferrer');
  toast.success(`Opening WhatsApp to share ${title}`);
};

// =========================================================================
// Entity-Specific Message Formatters for Clean, Professional Messages
// =========================================================================

export const formatInvoiceShare = (sale: any): SharePayload => {
  const invoiceNo = sale.invoiceNo || sale.invoiceNumber || sale.id || 'N/A';
  const customerName = sale.customerName || sale.partyName || 'Customer';
  const total = Number(sale.grandTotal || sale.totalAmount || sale.total || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const paid = Number(sale.paidAmount || sale.receivedAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const balance = Number(sale.balance || sale.dueAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const status = sale.paymentStatus || sale.status || 'Active';
  const phone = sale.customerPhone || sale.phone || '';
  const email = sale.customerEmail || sale.email || '';
  const date = sale.saleDate || sale.invoiceDate || sale.date || '';

  const itemsText = Array.isArray(sale.items) && sale.items.length > 0
    ? sale.items
        .map(
          (it: any) =>
            `• ${it.productName || it.name || 'Item'} (Qty: ${it.quantity || 1}) - ₹${Number(it.total || it.price || 0).toLocaleString('en-IN')}`
        )
        .join('\n')
    : '';

  const emailBody =
    `Dear ${customerName},\n\n` +
    `Thank you for your business. Here are your invoice details:\n\n` +
    `Invoice No: ${invoiceNo}\n` +
    (date ? `Date: ${date}\n` : '') +
    `Total Amount: ₹${total}\n` +
    `Amount Paid: ₹${paid}\n` +
    `Balance Due: ₹${balance}\n` +
    `Status: ${status}\n\n` +
    (itemsText ? `Items:\n${itemsText}\n\n` : '') +
    `Best regards,\nYAA Sales Team`;

  const whatsAppText =
    `*YAA SALES & MART - INVOICE*\n` +
    `--------------------------------\n` +
    `*Invoice #:* ${invoiceNo}\n` +
    `*Customer:* ${customerName}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    `*Grand Total:* ₹${total}\n` +
    `*Paid:* ₹${paid}\n` +
    `*Balance:* ₹${balance}\n` +
    `*Status:* ${status}\n\n` +
    (itemsText ? `*Items:*\n${itemsText}\n\n` : '') +
    `Thank you for choosing YAA Mart!`;

  return {
    title: `Invoice ${invoiceNo}`,
    subject: `Invoice #${invoiceNo} from YAA CRM`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatCategoryShare = (cat: any): SharePayload => {
  const name = cat.categoryName || cat.name || 'Category';
  const status = cat.status === 1 || cat.status === 'Active' ? 'Active' : 'Inactive';
  const subCount = cat.subcategoryCount || cat.subcategoriesCount || cat.subcategories?.length || 0;

  const emailBody =
    `Product Category Details:\n\n` +
    `Category Name: ${name}\n` +
    `Subcategories: ${subCount}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - Product Category*\n` +
    `--------------------------------\n` +
    `*Category:* ${name}\n` +
    `*Subcategories:* ${subCount}\n` +
    `*Status:* ${status}`;

  return {
    title: `Category "${name}"`,
    subject: `Product Category: ${name}`,
    body: emailBody,
    whatsAppText,
  };
};

export const formatSubcategoryShare = (sub: any): SharePayload => {
  const category = sub.category || sub.categoryName || '';
  const subcategory = sub.subcategory || sub.name || '';
  const status = sub.status === 1 || sub.status === 'Active' ? 'Active' : 'Inactive';

  const emailBody =
    `Product Subcategory Details:\n\n` +
    `Category: ${category}\n` +
    `Subcategory: ${subcategory}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - Product Subcategory*\n` +
    `--------------------------------\n` +
    `*Category:* ${category}\n` +
    `*Subcategory:* ${subcategory}\n` +
    `*Status:* ${status}`;

  return {
    title: `Subcategory "${subcategory}"`,
    subject: `Product Subcategory: ${subcategory}`,
    body: emailBody,
    whatsAppText,
  };
};

export const formatProductShare = (prod: any): SharePayload => {
  const name = prod.productName || prod.name || '';
  const code = prod.productCode || prod.code || '';
  const category = prod.category || 'General';
  const price = Number(prod.salePrice || prod.price || 0).toLocaleString('en-IN');
  const stock = prod.openingStock !== undefined ? prod.openingStock : prod.stock || 0;
  const unit = prod.unit || 'PCS';
  const status = prod.status || 'Active';

  const emailBody =
    `Product Details:\n\n` +
    `Product Name: ${name}\n` +
    `Product Code: ${code}\n` +
    `Category: ${category}\n` +
    `Sale Price: ₹${price}\n` +
    `Current Stock: ${stock} ${unit}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - Product Information*\n` +
    `--------------------------------\n` +
    `*Product:* ${name}\n` +
    `*Code:* ${code}\n` +
    `*Category:* ${category}\n` +
    `*Sale Price:* ₹${price}\n` +
    `*Stock:* ${stock} ${unit}\n` +
    `*Status:* ${status}`;

  return {
    title: `Product "${name}"`,
    subject: `Product Details: ${name} (${code})`,
    body: emailBody,
    whatsAppText,
  };
};

export const formatStockShare = (st: any): SharePayload => {
  const name = st.productName || st.name || '';
  const code = st.productCode || st.itemCode || '';
  const stock = st.inStock !== undefined ? st.inStock : st.quantity || 0;
  const unit = st.unit || 'PCS';
  const cost = Number(st.unitCost || 0).toLocaleString('en-IN');
  const price = Number(st.unitPrice || st.salePrice || 0).toLocaleString('en-IN');
  const loc = st.location || st.warehouse || 'Main Warehouse';

  const emailBody =
    `Inventory Stock Report:\n\n` +
    `Item: ${name} (${code})\n` +
    `In-Stock: ${stock} ${unit}\n` +
    `Unit Cost: ₹${cost}\n` +
    `Selling Price: ₹${price}\n` +
    `Location: ${loc}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - Inventory Stock*\n` +
    `--------------------------------\n` +
    `*Item:* ${name} (${code})\n` +
    `*In-Stock:* ${stock} ${unit}\n` +
    `*Unit Cost:* ₹${cost}\n` +
    `*Selling Rate:* ₹${price}\n` +
    `*Location:* ${loc}`;

  return {
    title: `Stock of ${name}`,
    subject: `Stock Details: ${name}`,
    body: emailBody,
    whatsAppText,
  };
};

export const formatCustomerShare = (cust: any): SharePayload => {
  const name = cust.name || cust.customerName || '';
  const code = cust.customerCode || cust.code || '';
  const phone = cust.phone || cust.mobile || '';
  const email = cust.email || '';
  const balance = Number(cust.outstandingBalance || cust.balance || 0).toLocaleString('en-IN');
  const city = cust.city || cust.address || '';

  const emailBody =
    `Customer Information:\n\n` +
    `Name: ${name}\n` +
    `Code: ${code}\n` +
    `Phone: ${phone}\n` +
    `Email: ${email}\n` +
    `Outstanding Balance: ₹${balance}\n` +
    `City/Address: ${city}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - Customer Profile*\n` +
    `--------------------------------\n` +
    `*Customer:* ${name}\n` +
    `*Code:* ${code}\n` +
    `*Phone:* ${phone}\n` +
    `*Outstanding Balance:* ₹${balance}\n` +
    `*Location:* ${city}`;

  return {
    title: `Customer "${name}"`,
    subject: `Customer Details: ${name}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatSupplierShare = (sup: any): SharePayload => {
  const name = sup.name || sup.supplierName || '';
  const code = sup.supplierCode || sup.code || '';
  const contact = sup.contactPerson || '';
  const phone = sup.phone || '';
  const email = sup.email || '';
  const address = sup.address || sup.city || '';

  const emailBody =
    `Supplier Information:\n\n` +
    `Supplier Name: ${name}\n` +
    `Code: ${code}\n` +
    `Contact Person: ${contact}\n` +
    `Phone: ${phone}\n` +
    `Email: ${email}\n` +
    `Address: ${address}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - Supplier Profile*\n` +
    `--------------------------------\n` +
    `*Supplier:* ${name}\n` +
    `*Code:* ${code}\n` +
    `*Contact Person:* ${contact}\n` +
    `*Phone:* ${phone}\n` +
    `*Address:* ${address}`;

  return {
    title: `Supplier "${name}"`,
    subject: `Supplier Details: ${name}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatPaymentInShare = (pay: any): SharePayload => {
  const refNo = pay.receiptNo || pay.refNo || pay.paymentNumber || pay.id || 'N/A';
  const customer = pay.customerName || pay.partyName || 'Customer';
  const amt = Number(pay.amount || pay.receivedAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const mode = pay.paymentMode || pay.mode || 'Cash';
  const date = pay.paymentDate || pay.date || '';
  const phone = pay.customerPhone || pay.phone || '';
  const email = pay.customerEmail || pay.email || '';

  const emailBody =
    `Dear ${customer},\n\n` +
    `We acknowledge receipt of your payment:\n\n` +
    `Receipt No: ${refNo}\n` +
    `Amount Received: ₹${amt}\n` +
    `Payment Mode: ${mode}\n` +
    (date ? `Date: ${date}\n` : '') +
    `\nThank you for your prompt payment!\n\n` +
    `Best regards,\nYAA Accounts Team`;

  const whatsAppText =
    `*YAA CRM - PAYMENT RECEIPT*\n` +
    `--------------------------------\n` +
    `*Receipt #:* ${refNo}\n` +
    `*Customer:* ${customer}\n` +
    `*Amount Received:* ₹${amt}\n` +
    `*Payment Mode:* ${mode}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    `\nThank you for your payment!`;

  return {
    title: `Payment Receipt ${refNo}`,
    subject: `Payment Receipt #${refNo} from YAA CRM`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatCreditNoteShare = (tx: any): SharePayload => {
  const refNo = tx.refNo || tx.creditNoteNo || tx.id || 'N/A';
  const customer = tx.customerName || tx.partyName || 'Customer';
  const amt = Number(tx.totalAmount || tx.grandTotal || tx.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = tx.saleDate || tx.date || '';
  const status = tx.status || 'Active';
  const phone = tx.customerPhone || tx.phone || '';
  const email = tx.customerEmail || tx.email || '';

  const emailBody =
    `Dear ${customer},\n\n` +
    `Here are your Credit Note / Return details:\n\n` +
    `Credit Note Ref: ${refNo}\n` +
    `Amount: ₹${amt}\n` +
    `Status: ${status}\n` +
    (date ? `Date: ${date}\n` : '') +
    `\nBest regards,\nYAA Sales Team`;

  const whatsAppText =
    `*YAA CRM - CREDIT NOTE*\n` +
    `--------------------------------\n` +
    `*Credit Note Ref:* ${refNo}\n` +
    `*Customer:* ${customer}\n` +
    `*Amount:* ₹${amt}\n` +
    `*Status:* ${status}\n` +
    (date ? `*Date:* ${date}\n` : '');

  return {
    title: `Credit Note ${refNo}`,
    subject: `Credit Note #${refNo} from YAA CRM`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatPurchaseOrderShare = (po: any): SharePayload => {
  const purchaseNo = po.purchaseNo || po.orderNo || po.id || 'N/A';
  const supplierName = po.supplierName || po.partyName || 'Supplier';
  const total = Number(po.grandTotal || po.totalAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = po.purchaseDate || po.date || '';
  const payStatus = po.paymentStatus || 'Pending';
  const status = po.purchaseStatus || po.status || 'Active';
  const phone = po.supplierPhone || po.phone || '';
  const email = po.supplierEmail || po.email || '';

  const emailBody =
    `Purchase Bill / Order Details:\n\n` +
    `Purchase Bill No: ${purchaseNo}\n` +
    `Supplier: ${supplierName}\n` +
    (date ? `Date: ${date}\n` : '') +
    `Total Amount: ₹${total}\n` +
    `Payment Status: ${payStatus}\n` +
    `Order Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - PURCHASE BILL*\n` +
    `--------------------------------\n` +
    `*Bill #:* ${purchaseNo}\n` +
    `*Supplier:* ${supplierName}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    `*Grand Total:* ₹${total}\n` +
    `*Payment Status:* ${payStatus}\n` +
    `*Status:* ${status}`;

  return {
    title: `Purchase Bill ${purchaseNo}`,
    subject: `Purchase Bill #${purchaseNo} - ${supplierName}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatPurchaseRequestShare = (req: any): SharePayload => {
  const requestNo = req.requestNo || req.id || 'N/A';
  const requestedBy = req.requestedBy || 'N/A';
  const department = req.department || 'N/A';
  const priority = req.priority || 'Medium';
  const status = req.status || 'Pending';
  const itemsText = Array.isArray(req.items) && req.items.length > 0
    ? req.items.map((i: any) => `• ${i.productName || i.name || 'Item'} (${i.requestedQuantity || i.quantity || 1} qty)`).join('\n')
    : '';

  const emailBody =
    `Purchase Request Details:\n\n` +
    `Request No: ${requestNo}\n` +
    `Requested By: ${requestedBy}\n` +
    `Department: ${department}\n` +
    `Priority: ${priority}\n` +
    `Status: ${status}\n\n` +
    (itemsText ? `Items:\n${itemsText}\n\n` : '') +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - PURCHASE REQUEST*\n` +
    `--------------------------------\n` +
    `*Request #:* ${requestNo}\n` +
    `*Requested By:* ${requestedBy}\n` +
    `*Department:* ${department}\n` +
    `*Priority:* ${priority}\n` +
    `*Status:* ${status}` +
    (itemsText ? `\n\n*Items:*\n${itemsText}` : '');

  return {
    title: `Purchase Request ${requestNo}`,
    subject: `Purchase Request #${requestNo}`,
    body: emailBody,
    whatsAppText,
  };
};

export const formatPurchaseReturnShare = (pret: any): SharePayload => {
  const returnNo = pret.returnNo || pret.id || 'N/A';
  const purchaseNo = pret.purchaseNo || 'N/A';
  const supplierName = pret.supplierName || pret.partyName || 'Supplier';
  const total = Number(pret.returnAmount || pret.grandTotal || pret.totalAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = pret.returnDate || pret.date || '';
  const status = pret.returnStatus || pret.status || 'Pending';
  const phone = pret.supplierPhone || pret.phone || '';
  const email = pret.supplierEmail || pret.email || '';

  const emailBody =
    `Purchase Return / Debit Note Details:\n\n` +
    `Return No: ${returnNo}\n` +
    `Original Purchase: ${purchaseNo}\n` +
    `Supplier: ${supplierName}\n` +
    (date ? `Return Date: ${date}\n` : '') +
    `Return Amount: ₹${total}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - PURCHASE RETURN*\n` +
    `--------------------------------\n` +
    `*Return #:* ${returnNo}\n` +
    `*Original Bill:* ${purchaseNo}\n` +
    `*Supplier:* ${supplierName}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    `*Return Amount:* ₹${total}\n` +
    `*Status:* ${status}`;

  return {
    title: `Purchase Return ${returnNo}`,
    subject: `Purchase Return #${returnNo} - ${supplierName}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatPaymentOutShare = (po: any): SharePayload => {
  const paymentNo = po.paymentNo || po.id || 'N/A';
  const supplierName = po.supplierName || po.partyName || 'Supplier';
  const amt = Number(po.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = po.paymentDate || po.date || '';
  const mode = po.paymentMode || po.mode || 'Cash';
  const ref = po.referenceNo || po.refNo || 'N/A';
  const status = po.status || 'Completed';
  const phone = po.supplierPhone || po.phone || '';
  const email = po.supplierEmail || po.email || '';

  const emailBody =
    `Payment Voucher Details:\n\n` +
    `Payment No: ${paymentNo}\n` +
    `Supplier: ${supplierName}\n` +
    (date ? `Payment Date: ${date}\n` : '') +
    `Amount Paid: ₹${amt}\n` +
    `Payment Mode: ${mode}\n` +
    `Reference: ${ref}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - PAYMENT VOUCHER*\n` +
    `--------------------------------\n` +
    `*Voucher #:* ${paymentNo}\n` +
    `*Supplier:* ${supplierName}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    `*Amount Paid:* ₹${amt}\n` +
    `*Mode:* ${mode}\n` +
    `*Ref:* ${ref}\n` +
    `*Status:* ${status}`;

  return {
    title: `Payment Voucher ${paymentNo}`,
    subject: `Payment Voucher #${paymentNo} - ${supplierName}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatExpenseShare = (exp: any): SharePayload => {
  const expenseNo = exp.expenseNo || exp.id || 'N/A';
  const title = exp.title || 'Expense';
  const category = exp.category || 'General';
  const payee = exp.payee || 'N/A';
  const amt = Number(exp.totalAmount || exp.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = exp.expenseDate || exp.date || '';
  const mode = exp.paymentMode || exp.mode || 'Cash';
  const status = exp.status || 'Paid';

  const emailBody =
    `Expense Voucher Details:\n\n` +
    `Expense No: ${expenseNo}\n` +
    `Title: ${title}\n` +
    `Category: ${category}\n` +
    `Payee: ${payee}\n` +
    (date ? `Date: ${date}\n` : '') +
    `Total Amount: ₹${amt}\n` +
    `Payment Mode: ${mode}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - EXPENSE VOUCHER*\n` +
    `--------------------------------\n` +
    `*Expense #:* ${expenseNo}\n` +
    `*Title:* ${title}\n` +
    `*Category:* ${category}\n` +
    `*Payee:* ${payee}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    `*Amount:* ₹${amt}\n` +
    `*Mode:* ${mode}\n` +
    `*Status:* ${status}`;

  return {
    title: `Expense ${expenseNo}`,
    subject: `Expense Voucher #${expenseNo}: ${title}`,
    body: emailBody,
    whatsAppText,
  };
};

export const formatSaleOrderShare = (so: any): SharePayload => {
  const orderNo = so.orderNo || so.id || 'N/A';
  const customer = so.partyName || so.customerName || 'Customer';
  const total = Number(so.amount || so.grandTotal || so.totalAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = so.orderDate || so.date || '';
  const due = so.dueDate || '';
  const status = so.status || 'Open';
  const phone = so.phone || so.customerPhone || '';
  const email = so.email || so.customerEmail || '';

  const emailBody =
    `Sale Order Details:\n\n` +
    `Order No: ${orderNo}\n` +
    `Customer: ${customer}\n` +
    (date ? `Order Date: ${date}\n` : '') +
    (due ? `Due Date: ${due}\n` : '') +
    `Total Amount: ₹${total}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - SALE ORDER*\n` +
    `--------------------------------\n` +
    `*Order #:* ${orderNo}\n` +
    `*Customer:* ${customer}\n` +
    (date ? `*Order Date:* ${date}\n` : '') +
    (due ? `*Due Date:* ${due}\n` : '') +
    `*Total Amount:* ₹${total}\n` +
    `*Status:* ${status}`;

  return {
    title: `Sale Order ${orderNo}`,
    subject: `Sale Order #${orderNo} - ${customer}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatDeliveryChallanShare = (dc: any): SharePayload => {
  const challanNo = dc.challanNo || dc.id || 'N/A';
  const customer = dc.partyName || dc.customerName || 'Customer';
  const total = Number(dc.amount || dc.grandTotal || dc.totalAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = dc.challanDate || dc.date || '';
  const status = dc.status || 'Active';
  const phone = dc.phone || dc.customerPhone || '';
  const email = dc.email || dc.customerEmail || '';

  const emailBody =
    `Delivery Challan Details:\n\n` +
    `Challan No: ${challanNo}\n` +
    `Customer: ${customer}\n` +
    (date ? `Challan Date: ${date}\n` : '') +
    `Total Value: ₹${total}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - DELIVERY CHALLAN*\n` +
    `--------------------------------\n` +
    `*Challan #:* ${challanNo}\n` +
    `*Customer:* ${customer}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    `*Total Value:* ₹${total}\n` +
    `*Status:* ${status}`;

  return {
    title: `Delivery Challan ${challanNo}`,
    subject: `Delivery Challan #${challanNo} - ${customer}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatEstimateQuotationShare = (eq: any): SharePayload => {
  const quoteNo = eq.quotationNo || eq.estimateNo || eq.id || 'N/A';
  const customer = eq.partyName || eq.customerName || 'Customer';
  const total = Number(eq.grandTotal || eq.amount || eq.totalAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = eq.quotationDate || eq.estimateDate || eq.date || '';
  const validUntil = eq.validUntil || eq.expiryDate || '';
  const status = eq.status || 'Active';
  const phone = eq.phone || eq.customerPhone || '';
  const email = eq.email || eq.customerEmail || '';

  const emailBody =
    `Estimate / Quotation Details:\n\n` +
    `Quotation No: ${quoteNo}\n` +
    `Customer: ${customer}\n` +
    (date ? `Quotation Date: ${date}\n` : '') +
    (validUntil ? `Valid Until: ${validUntil}\n` : '') +
    `Estimated Amount: ₹${total}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - ESTIMATE / QUOTATION*\n` +
    `--------------------------------\n` +
    `*Quotation #:* ${quoteNo}\n` +
    `*Customer:* ${customer}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    (validUntil ? `*Valid Until:* ${validUntil}\n` : '') +
    `*Amount:* ₹${total}\n` +
    `*Status:* ${status}`;

  return {
    title: `Quotation ${quoteNo}`,
    subject: `Estimate / Quotation #${quoteNo} - ${customer}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatProformaInvoiceShare = (pi: any): SharePayload => {
  const piNo = pi.proformaNo || pi.invoiceNo || pi.id || 'N/A';
  const customer = pi.partyName || pi.customerName || 'Customer';
  const total = Number(pi.grandTotal || pi.amount || pi.totalAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const date = pi.proformaDate || pi.date || '';
  const status = pi.status || 'Active';
  const phone = pi.phone || pi.customerPhone || '';
  const email = pi.email || pi.customerEmail || '';

  const emailBody =
    `Proforma Invoice Details:\n\n` +
    `Proforma No: ${piNo}\n` +
    `Customer: ${customer}\n` +
    (date ? `Date: ${date}\n` : '') +
    `Grand Total: ₹${total}\n` +
    `Status: ${status}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - PROFORMA INVOICE*\n` +
    `--------------------------------\n` +
    `*Proforma #:* ${piNo}\n` +
    `*Customer:* ${customer}\n` +
    (date ? `*Date:* ${date}\n` : '') +
    `*Grand Total:* ₹${total}\n` +
    `*Status:* ${status}`;

  return {
    title: `Proforma Invoice ${piNo}`,
    subject: `Proforma Invoice #${piNo} - ${customer}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: phone,
    whatsAppText,
  };
};

export const formatSalesRepShare = (rep: any): SharePayload => {
  const name = rep.name || 'Sales Representative';
  const mobile = rep.mobile || rep.phone || '';
  const email = rep.email || '';
  const designation = rep.designation || 'Sales Representative';
  const status = rep.status || 'Active';
  const customersCount = rep.assignedCustomersCount || 0;
  const invoicesCount = rep.assignedInvoicesCount || 0;
  const outstanding = Number(rep.totalOutstandingAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });
  const collected = Number(rep.totalCollectedAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });

  const emailBody =
    `Sales Representative Profile:\n\n` +
    `Name: ${name}\n` +
    (designation ? `Designation: ${designation}\n` : '') +
    (mobile ? `Mobile: ${mobile}\n` : '') +
    (email ? `Email: ${email}\n` : '') +
    `Status: ${status}\n\n` +
    `Portfolio Summary:\n` +
    `Assigned Customers: ${customersCount}\n` +
    `Assigned Invoices: ${invoicesCount}\n` +
    `Total Collected: ₹${collected}\n` +
    `Total Outstanding: ₹${outstanding}\n\n` +
    `Shared via YAA CRM.`;

  const whatsAppText =
    `*YAA CRM - Sales Representative Profile*\n` +
    `--------------------------------\n` +
    `*Name:* ${name}\n` +
    (designation ? `*Designation:* ${designation}\n` : '') +
    (mobile ? `*Mobile:* ${mobile}\n` : '') +
    (email ? `*Email:* ${email}\n` : '') +
    `*Status:* ${status}\n` +
    `*Assigned Customers:* ${customersCount}\n` +
    `*Assigned Invoices:* ${invoicesCount}\n` +
    `*Total Collected:* ₹${collected}\n` +
    `*Outstanding:* ₹${outstanding}`;

  return {
    title: `Sales Rep "${name}"`,
    subject: `Sales Representative Profile: ${name}`,
    body: emailBody,
    recipientEmail: email,
    recipientPhone: mobile,
    whatsAppText,
  };
};

// =========================================================================
// Universal Floating Share Popover Dropdown Component
// =========================================================================

export interface ShareDropdownProps {
  /** Unique ID of the row / item */
  id: string;
  /** Active share popover ID currently open */
  activeShareId?: string | null;
  /** Setter to open/close popovers */
  setActiveShareId?: (id: string | null) => void;
  /** Pre-calculated position object (or automatically handled) */
  sharePos?: { top?: number; bottom?: number; right?: number } | any | null;
  /** Setter for position */
  setSharePos?: (pos: any) => void;
  /** Share data payload or getter function */
  getShareData: () => SharePayload;
  /** Optional custom button class name */
  buttonClassName?: string;
  /** Optional custom icon */
  icon?: React.ReactNode;
  /** Optional tooltip */
  title?: string;
}

export const UniversalShareDropdown: React.FC<ShareDropdownProps> = ({
  id,
  activeShareId,
  setActiveShareId,
  sharePos,
  setSharePos,
  getShareData,
  buttonClassName = 'w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer',
  icon = <Forward className="w-4 h-4 text-[#2563EB]" />,
  title = 'Share',
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [internalPos, setInternalPos] = useState<{ top?: number; bottom?: number; right?: number } | null>(null);

  const isOpen = activeShareId === id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setActiveShareId(null);
      if (setSharePos) setSharePos(null);
      setInternalPos(null);
    } else {
      const btnRect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - btnRect.bottom;
      const popoverHeight = 150;
      const rightPos = Math.max(12, window.innerWidth - btnRect.right - 20);

      const computedPos = spaceBelow < popoverHeight
        ? {
            bottom: window.innerHeight - btnRect.top + 6,
            right: rightPos,
          }
        : {
            top: btnRect.bottom + 6,
            right: rightPos,
          };

      if (setSharePos) {
        setSharePos(computedPos);
      }
      setInternalPos(computedPos);
      setActiveShareId(id);
    }
  };

  const posToUse = sharePos || internalPos;

  // Handle Gmail click
  const handleGmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveShareId(null);
    if (setSharePos) setSharePos(null);
    const data = getShareData();
    shareOnGmail({
      subject: data.subject,
      body: data.body,
      to: data.recipientEmail,
      title: data.title,
    });
  };

  // Handle WhatsApp click
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveShareId(null);
    if (setSharePos) setSharePos(null);
    const data = getShareData();
    shareOnWhatsApp({
      text: data.whatsAppText || data.body,
      phone: data.recipientPhone,
      title: data.title,
    });
  };

  return (
    <div className="relative inline-block text-left share-popover-container">
      <button
        ref={buttonRef}
        type="button"
        title={title}
        onClick={handleToggle}
        className={buttonClassName}
      >
        {icon}
      </button>

      {isOpen && posToUse && (
        <div
          className="share-popover-menu share-dropdown-menu fixed z-[9999] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left min-w-[200px]"
          style={{
            top: posToUse.top !== undefined ? `${posToUse.top}px` : 'auto',
            bottom: posToUse.bottom !== undefined ? `${posToUse.bottom}px` : 'auto',
            right: `${posToUse.right}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-bold text-slate-800 mb-3 px-1 tracking-tight">
            Share
          </div>
          <div className="flex items-center justify-between gap-3">
            {/* Gmail Option */}
            <button
              type="button"
              onClick={handleGmail}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1 focus:outline-none"
              title="Share on Gmail"
            >
              <div className="w-11 h-11 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center group-hover:scale-110 group-hover:border-red-300 transition-all">
                <GmailIcon className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                Gmail
              </span>
            </button>

            {/* WhatsApp Option */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1 focus:outline-none"
              title="Share on WhatsApp"
            >
              <div className="w-11 h-11 rounded-full bg-[#25D366] shadow-xs flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all">
                <WhatsAppIcon className="w-5.5 h-5.5 text-white fill-white" />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                WhatsApp
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
