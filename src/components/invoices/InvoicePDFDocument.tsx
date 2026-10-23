import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Path,
  Circle,
} from '@react-pdf/renderer';
import { SavedInvoice } from '../../store/useInvoiceStore';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 42,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155', // slate-700
    backgroundColor: '#FFFFFF',
  },
  // Top Title
  mainTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  // Header Ribbon
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerMetaLeft: {
    width: '58%',
  },
  headerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerMetaLabel: {
    width: 140,
    color: '#64748B', // slate-500
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  headerMetaColon: {
    width: 12,
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'left',
  },
  headerMetaValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155', // slate-700 (crisp and readable, not stark pitch-black)
  },
  headerMetaValueOrange: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#EA580C', // orange-600
  },
  // Header Right: Company Branding
  logoContainer: {
    width: '40%',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  headerMetaRight: {
    width: '40%',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  logoImage: {
    width: 175,
    height: 52,
    objectFit: 'contain',
  },
  // Divider
  dashedLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1', // slate-300
    borderBottomStyle: 'dashed',
    marginTop: 4,
    marginBottom: 16,
  },
  // Billing Grid
  billingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  billingCol: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 12.5,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 5,
    marginBottom: 8,
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5.5,
  },
  billingLabel: {
    width: 102,
    fontFamily: 'Helvetica-Bold',
    color: '#334155', // slate-700 (bold & highlighted, not harsh pitch-black)
    fontSize: 9,
  },
  billingColon: {
    width: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    fontSize: 9,
    textAlign: 'left',
  },
  billingValue: {
    flex: 1,
    fontFamily: 'Helvetica',
    color: '#334155',
    fontSize: 9,
    lineHeight: 1.35,
  },
  billingValueBold: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    fontSize: 9,
    lineHeight: 1.35,
  },
  // Table
  tableContainer: {
    marginTop: 6,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2B3991',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textTransform: 'uppercase',
    alignItems: 'center',
  },
  tableHeaderCell: {
    paddingVertical: 7,
    paddingHorizontal: 2,
    color: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    fontSize: 7.5,
    alignItems: 'stretch',
    minHeight: 34,
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    justifyContent: 'center',
  },
  colNum: { width: '4%', textAlign: 'center' },
  colItem: { width: '20%', textAlign: 'left', paddingHorizontal: 4 },
  colGst: { width: '6%', textAlign: 'center' },
  colQty: { width: '5%', textAlign: 'center' },
  colRate: { width: '10%', textAlign: 'center' },
  colSub: { width: '11%', textAlign: 'center' },
  colDisc: { width: '10%', textAlign: 'center' },
  colCgst: { width: '11%', textAlign: 'center' },
  colSgst: { width: '11%', textAlign: 'center' },
  colTotal: { width: '12%', textAlign: 'right', paddingRight: 4, borderRightWidth: 0 },

  // Summary Ribbon
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -1,
    marginBottom: 20,
  },
  summaryRibbon: {
    width: '55%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    color: '#475569', // slate-600
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  summaryLabelOrange: {
    color: '#475569', // default slate-600 instead of orange
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  summaryValue: {
    fontFamily: 'Helvetica',
    color: '#334155', // slate-700 (softer, not stark heavy dark)
    fontSize: 9,
    lineHeight: 1.4,
  },
  summaryValueOrange: {
    fontFamily: 'Helvetica',
    color: '#334155',
    fontSize: 9,
    lineHeight: 1.4,
  },
  summaryGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 5,
    marginTop: 4,
    marginBottom: 2,
  },
  summaryGrandTotalLabel: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155', // slate-700
  },
  summaryGrandTotalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#334155', // slate-700 (gentle, not harsh dark)
  },
  summaryPaidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  summaryPaidLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#475569',
    lineHeight: 1.4,
  },
  summaryPaidValue: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155', // slate-700
    lineHeight: 1.4,
  },
  summaryTdsLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#475569',
    lineHeight: 1.4,
  },
  summaryTdsValue: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
    lineHeight: 1.4,
  },
  summaryDueLabel: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155', // slate-700
    lineHeight: 1.4,
  },
  summaryDueValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#334155', // slate-700
    lineHeight: 1.4,
  },

  // Bottom Section
  bottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  bankCol: {
    width: '47%',
  },
  signCol: {
    width: '49%',
    alignItems: 'flex-end',
  },
  signDate: {
    fontSize: 8,
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'right',
  },
  signSvgBox: {
    width: 175,
    height: 38,
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  signBorder: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    width: 175,
    paddingTop: 6,
    alignItems: 'flex-end',
  },
  signCompany: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 3,
  },
  signBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  signCheckIcon: {
    width: 10,
    height: 10,
    marginRight: 4,
  },
  signAuthText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'right',
  },
});

interface InvoicePDFDocumentProps {
  invoice: SavedInvoice;
  documentTitle?: string;
}

export const InvoicePDFDocument: React.FC<InvoicePDFDocumentProps> = ({ invoice, documentTitle = 'Invoice' }) => {
  const activeInvoice = invoice;
  const isProforma = documentTitle.toLowerCase().includes('proforma');

  // Custom fields filtering
  const filteredCustomFields = (activeInvoice.customFields || []).filter((cf) => {
    const idNorm = (cf.id || '').toLowerCase().trim();
    const labelNorm = (cf.label || '').toLowerCase().trim().replace(/[:#]/g, '').trim();
    return (
      idNorm !== 'invoice-number' &&
      idNorm !== 'invoice-date' &&
      idNorm !== 'reference-number' &&
      idNorm !== 'due-date' &&
      labelNorm !== 'invoice number' &&
      labelNorm !== 'invoice no' &&
      labelNorm !== 'invoice date' &&
      labelNorm !== 'reference number' &&
      labelNorm !== 'reference no' &&
      labelNorm !== 'reference' &&
      labelNorm !== 'due date'
    );
  });

  // Rounding calculation
  const rawTotal = (activeInvoice.taxableAmount || 0) + (activeInvoice.taxTotal || 0);
  const roundDiff = (activeInvoice as any).roundOffAmount !== undefined
    ? Number((activeInvoice as any).roundOffAmount)
    : Number((activeInvoice.grandTotal - rawTotal).toFixed(2));
  const mode = (activeInvoice as any).roundMode || (roundDiff < -0.005 ? 'down' : roundDiff > 0.005 ? 'up' : 'none');
  const showRounding = !(mode === 'none' && Math.abs(roundDiff) < 0.005);
  const isDown = mode === 'down' || roundDiff < 0;
  const roundLabel = isDown ? 'Rounded Down' : 'Rounded Up';
  const roundFormatted = isDown ? `-₹${Math.abs(roundDiff).toFixed(2)}` : `+₹${Math.abs(roundDiff).toFixed(2)}`;

  // Payment totals
  const paidAmount = activeInvoice.status === 'Pending'
    ? 0
    : (activeInvoice.paymentDetails?.amountPaid ?? (activeInvoice.status === 'Paid' ? activeInvoice.grandTotal : 0));
  const tdsAmount = Number(activeInvoice.paymentDetails?.tdsDeduction || 0);
  const balanceDue = Math.max(0, activeInvoice.grandTotal - paidAmount);
  const isPartiallyPaid = activeInvoice.status === 'Partially Paid' || (paidAmount > 0 && balanceDue > 0.005);

  const logoSrc = typeof window !== 'undefined' ? `${window.location.origin}/yaa-creations-logo.png` : '/yaa-creations-logo.png';

  return (
    <Document title={`${documentTitle}-${activeInvoice.invoiceNumber}`} author={activeInvoice.company.name}>
      <Page size="A4" style={styles.page}>
        {/* 1. Large Top Title */}
        <Text style={styles.mainTitle}>{documentTitle}</Text>

        {/* 2. Top Header Ribbon */}
        <View style={styles.headerRow}>
          {/* Left: Metadata */}
          <View style={styles.headerMetaLeft}>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>
                {isProforma ? 'Proforma Invoice Number' : 'Invoice Number'}
              </Text>
              <Text style={styles.headerMetaColon}>:</Text>
              <Text style={styles.headerMetaValue}>{activeInvoice.invoiceNumber}</Text>
            </View>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>
                {isProforma ? 'Proforma Invoice Date' : 'Invoice Date'}
              </Text>
              <Text style={styles.headerMetaColon}>:</Text>
              <Text style={styles.headerMetaValue}>{activeInvoice.invoiceDate}</Text>
            </View>
            {activeInvoice.dueDate ? (
              <View style={styles.headerMetaItem}>
                <Text style={styles.headerMetaLabel}>Due Date</Text>
                <Text style={styles.headerMetaColon}>:</Text>
                <Text style={styles.headerMetaValue}>{activeInvoice.dueDate}</Text>
              </View>
            ) : null}
            {activeInvoice.referenceNumbers && activeInvoice.referenceNumbers.length > 0 ? (
              <View style={styles.headerMetaItem}>
                <Text style={styles.headerMetaLabel}>Reference</Text>
                <Text style={styles.headerMetaColon}>:</Text>
                <Text style={styles.headerMetaValue}>{activeInvoice.referenceNumbers.join(', ')}</Text>
              </View>
            ) : null}
            {filteredCustomFields.map((cf) => (
              <View key={cf.id} style={styles.headerMetaItem}>
                <Text style={styles.headerMetaLabel}>{cf.label.replace(/:$/, '')}</Text>
                <Text style={styles.headerMetaColon}>:</Text>
                <Text style={styles.headerMetaValue}>{cf.value}</Text>
              </View>
            ))}
          </View>

          {/* Right: Company Logo */}
          <View style={styles.logoContainer}>
            <Image src={logoSrc} style={styles.logoImage} />
          </View>
        </View>

        {/* 3. Dotted Divider */}
        <View style={styles.dashedLine} />

        {/* 4. Billing Grid (Billing From & Bill To) */}
        <View style={styles.billingGrid}>
          {/* Billing From */}
          <View style={styles.billingCol}>
            <Text style={styles.sectionTitle}>Billing From:</Text>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Company Name</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.company.name}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>GSTIN / Tax ID</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.company.taxId || '27AABCA1234F1Z8'}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>PAN Number</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.company.pan || 'ABCDE1234F'}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Phone Number</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.company.phone}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Email</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.company.email}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Company Address</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.company.address}</Text>
            </View>
          </View>

          {/* Bill To */}
          <View style={styles.billingCol}>
            <Text style={styles.sectionTitle}>Billing To:</Text>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Company Name</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.client.company}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>GSTIN / Tax ID</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>
                {activeInvoice.client.gstin || activeInvoice.client.taxId || '27AABCT8892K1Z5'}
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>PAN Number</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.client.pan || 'ABCDE9876G'}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Phone Number</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.client.phone || 'N/A'}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Email</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.client.email}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Company Address</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>
                {activeInvoice.client.location &&
                (activeInvoice.client.location.includes('Suite') ||
                  activeInvoice.client.location.includes('Hub') ||
                  activeInvoice.client.location.includes('Building') ||
                  activeInvoice.client.location.includes('Floor'))
                  ? activeInvoice.client.location
                  : activeInvoice.client.location
                  ? `Suite 750, Innovation Park, ${activeInvoice.client.location} 75201`
                  : 'Suite 750, Innovation Park, Dallas, TX 75201'}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Service Details / Line Items Table */}
        <Text style={[styles.sectionTitle, { marginBottom: 6, borderBottomWidth: 0 }]}>Service Details:</Text>
        <View style={styles.tableContainer}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.colGst]}>GST</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.colSub]}>Subtotal</Text>
            <Text style={[styles.tableHeaderCell, styles.colDisc]}>Discount</Text>
            <Text style={[styles.tableHeaderCell, styles.colCgst]}>CGST</Text>
            <Text style={[styles.tableHeaderCell, styles.colSgst]}>SGST</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>

          {/* Rows */}
          {activeInvoice.items.map((it, idx) => {
            const itemSub = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
            const itemDisc = Number(it.discount) || 0;
            const itemTaxable = Math.max(0, itemSub - itemDisc);
            const itemTax = (itemTaxable * (Number(it.taxPercent) || 0)) / 100;
            const halfTax = itemTax / 2;
            const itemTotal = it.total || (itemTaxable + itemTax);

            return (
              <View
                key={it.id || idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
              >
                <Text style={[styles.tableCell, styles.colNum, { fontFamily: 'Helvetica-Bold' }]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, styles.colItem, { fontFamily: 'Helvetica-Bold', color: '#0F172A' }]}>
                  {it.name}
                </Text>
                <Text style={[styles.tableCell, styles.colGst]}>{it.taxPercent}%</Text>
                <Text style={[styles.tableCell, styles.colQty, { fontFamily: 'Helvetica-Bold' }]}>{it.qty}</Text>
                <Text style={[styles.tableCell, styles.colRate]}>₹{it.unitPrice.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.colSub]}>₹{itemSub.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.colDisc]}>₹{itemDisc.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.colCgst]}>₹{halfTax.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.colSgst]}>₹{halfTax.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.colTotal, { fontFamily: 'Helvetica-Bold', color: '#0F172A' }]}>
                  ₹{itemTotal.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 6. Summary Ribbon (Subtotal, Discount, GST, Rounding, Grand Total, Paid, TDS, Balance) */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryRibbon}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ₹{(activeInvoice.subtotal || activeInvoice.taxableAmount).toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabelOrange}>Discount</Text>
              <Text style={styles.summaryValueOrange}>
                {activeInvoice.totalDiscount > 0
                  ? `-₹${activeInvoice.totalDiscount.toFixed(2)}`
                  : '₹0.00'}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>GST Total</Text>
              <Text style={styles.summaryValue}>₹{activeInvoice.taxTotal.toFixed(2)}</Text>
            </View>

            {showRounding && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{roundLabel}</Text>
                <Text style={styles.summaryValue}>
                  {roundFormatted}
                </Text>
              </View>
            )}

            <View style={styles.summaryGrandTotalRow}>
              <Text style={styles.summaryGrandTotalLabel}>Grand Total</Text>
              <Text style={styles.summaryGrandTotalValue}>₹{activeInvoice.grandTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryPaidRow}>
              <Text style={styles.summaryPaidLabel}>Total Paid</Text>
              <Text style={styles.summaryPaidValue}>₹{paidAmount.toFixed(2)}</Text>
            </View>

            {tdsAmount > 0 && (
              <View style={styles.summaryPaidRow}>
                <Text style={styles.summaryTdsLabel}>
                  TDS Deducted {activeInvoice.paymentDetails?.tdsSection ? `(${activeInvoice.paymentDetails.taxDeductedType === 'gst' ? 'GST' : 'IT'})` : ''}
                </Text>
                <Text style={styles.summaryTdsValue}>-₹{tdsAmount.toFixed(2)}</Text>
              </View>
            )}

            {isPartiallyPaid && (
              <View style={styles.summaryPaidRow}>
                <Text style={styles.summaryDueLabel}>Balance Due</Text>
                <Text style={styles.summaryDueValue}>₹{balanceDue.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 7. Bottom Settlement / Bank Information & Signature */}
        <View style={styles.bottomGrid}>
          {/* Bank Info */}
          <View style={styles.bankCol}>
            <Text style={styles.sectionTitle}>Billing Information:</Text>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Account Name</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.bank?.accountName || activeInvoice.company.name}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Bank Account</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>
                {activeInvoice.bank?.accountNumber || '50200012345678'} ({activeInvoice.bank?.bankName || 'HDFC Bank'})
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>IFSC Code</Text>
              <Text style={styles.billingColon}>:</Text>
              <Text style={styles.billingValue}>{activeInvoice.bank?.ifscCode || 'HDFC0001234'}</Text>
            </View>
            {activeInvoice.bank?.upiId ? (
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Instant UPI VPA</Text>
                <Text style={styles.billingColon}>:</Text>
                <Text style={styles.billingValue}>{activeInvoice.bank.upiId}</Text>
              </View>
            ) : null}
          </View>

          {/* Signature Block */}
          <View style={styles.signCol}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 8.5, color: '#64748B', marginRight: 4 }}>Date of Signing:</Text>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0F172A' }}>{activeInvoice.invoiceDate}</Text>
            </View>
            <View style={styles.signSvgBox}>
              <Svg viewBox="0 0 200 60">
                <Path
                  d="M10 40 C 30 10, 45 55, 60 25 C 75 -5, 85 45, 105 30 C 120 15, 130 50, 150 20 C 160 5, 175 35, 195 25"
                  stroke="#33077C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M30 48 C 65 42, 110 50, 180 45"
                  stroke="#4309A2"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <View style={styles.signBorder}>
              <Text style={styles.signCompany}>{activeInvoice.company.name}</Text>
              <View style={styles.signBadgeRow}>
                <Svg viewBox="0 0 16 16" style={styles.signCheckIcon}>
                  <Circle cx="8" cy="8" r="7" stroke="#10B981" strokeWidth="1.5" fill="none" />
                  <Path d="M4.5 8.2 L6.8 10.5 L11.5 5.8" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
                <Text style={styles.signAuthText}>Authorized Signatory</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
