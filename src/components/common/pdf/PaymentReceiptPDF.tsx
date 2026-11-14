import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { numberToWordsIndian, pdfToday } from '../../../utils/printUtils';

export interface PaymentReceiptOptions {
  receiptNo: string;
  paymentDate: string; // already formatted DD/MM/YYYY
  dueDate?: string;
  status?: string;
  statusColor?: 'emerald' | 'amber' | 'purple' | 'slate';
  customerName: string;
  paymentMethod?: string;
  description?: string;
  totalAmount: number;
  paidAmount: number;
  notes?: string;

  companyName?: string;
  companySubtitle?: string;
  companyAddress?: string;
  companyGstin?: string;
  companyPhone?: string;
  companyEmail?: string;
}

const PURPLE = '#33077C';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
    paddingBottom: 14,
    marginBottom: 18,
  },
  companyCol: { width: '58%' },
  companyName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: PURPLE, marginBottom: 3 },
  companyText: { fontSize: 8, color: '#64748B', lineHeight: 1.45 },
  titleCol: { width: '40%', alignItems: 'flex-end' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#0F172A', letterSpacing: 0.5 },
  number: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: PURPLE, marginTop: 4 },
  badge: {
    marginTop: 7,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },

  // Two cards
  cardsRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
  },
  cardTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: PURPLE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingBottom: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  partyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0F172A' },
  partySub: { fontSize: 8, color: '#64748B', marginTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  detailLabel: { fontSize: 8.5, color: '#64748B' },
  detailValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0F172A', maxWidth: '60%', textAlign: 'right' },

  // Amount highlight
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PURPLE,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  amountLabel: { fontSize: 8, color: '#DDD6FE', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  amountWords: { fontSize: 8.5, color: '#FFFFFF', marginTop: 4, maxWidth: 300 },
  amountValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },

  // Table
  table: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, marginBottom: 16, overflow: 'hidden' },
  tHead: { flexDirection: 'row', backgroundColor: '#EDE9FE', paddingVertical: 7, paddingHorizontal: 12 },
  tHeadText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.5 },
  tRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  tTotal: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  cellDesc: { width: '70%', fontSize: 9, color: '#0F172A' },
  cellAmt: { width: '30%', textAlign: 'right', fontSize: 9, color: '#0F172A' },
  boldText: { fontFamily: 'Helvetica-Bold' },

  notesBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  notesTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  notesText: { fontSize: 8.5, color: '#475569', lineHeight: 1.4 },

  signRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 34 },
  signBox: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    paddingTop: 5,
    textAlign: 'center',
    fontSize: 8,
    color: '#475569',
  },

  footer: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 5,
    fontSize: 7,
    color: '#94A3B8',
  },
});

const BADGE: Record<string, { backgroundColor: string; color: string }> = {
  emerald: { backgroundColor: '#D1FAE5', color: '#047857' },
  amber: { backgroundColor: '#FEF3C7', color: '#B45309' },
  purple: { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  slate: { backgroundColor: '#F1F5F9', color: '#475569' },
};

const money = (n: number) =>
  `Rs. ${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PaymentReceiptPDF: React.FC<{ options: PaymentReceiptOptions }> = ({ options }) => {
  const {
    receiptNo,
    paymentDate,
    dueDate,
    status,
    statusColor = 'slate',
    customerName,
    paymentMethod,
    description,
    totalAmount,
    paidAmount,
    notes,
    companyName = '',
    companySubtitle = '',
    companyAddress = '',
    companyGstin = '',
    companyPhone = '',
    companyEmail = '',
  } = options;

  const contact = [companyGstin ? `GSTIN: ${companyGstin}` : '', companyPhone ? `Phone: ${companyPhone}` : '']
    .filter(Boolean)
    .join('  |  ');

  const details: { label: string; value: string }[] = [
    { label: 'Receipt No', value: receiptNo },
    { label: 'Payment Date', value: paymentDate },
    ...(dueDate ? [{ label: 'Due Date', value: dueDate }] : []),
    ...(paymentMethod ? [{ label: 'Payment Mode', value: paymentMethod }] : []),
  ];

  return (
    <Document title={`Payment Receipt - ${receiptNo}`} author={companyName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.companyCol}>
            <Text style={styles.companyName}>{companyName}</Text>
            {companySubtitle ? <Text style={styles.companyText}>{companySubtitle}</Text> : null}
            {companyAddress ? <Text style={styles.companyText}>{companyAddress}</Text> : null}
            {contact ? <Text style={styles.companyText}>{contact}</Text> : null}
            {companyEmail ? <Text style={styles.companyText}>Email: {companyEmail}</Text> : null}
          </View>
          <View style={styles.titleCol}>
            <Text style={styles.title}>PAYMENT RECEIPT</Text>
            <Text style={styles.number}># {receiptNo}</Text>
            {status ? <Text style={[styles.badge, BADGE[statusColor] || BADGE.slate]}>{status}</Text> : null}
          </View>
        </View>

        {/* Received from + payment details */}
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Received From</Text>
            <Text style={styles.partyName}>{customerName}</Text>
            <Text style={styles.partySub}>Thank you for your payment.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Details</Text>
            {details.map((d) => (
              <View key={d.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Amount highlight */}
        <View style={styles.amountBox}>
          <View>
            <Text style={styles.amountLabel}>Amount Received</Text>
            <Text style={styles.amountWords}>{numberToWordsIndian(paidAmount)}</Text>
          </View>
          <Text style={styles.amountValue}>{money(paidAmount)}</Text>
        </View>

        {/* Summary table */}
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.tHeadText, { width: '70%' }]}>Description</Text>
            <Text style={[styles.tHeadText, { width: '30%', textAlign: 'right' }]}>Amount</Text>
          </View>
          <View style={styles.tRow}>
            <Text style={styles.cellDesc}>{description || 'Payment received'}</Text>
            <Text style={styles.cellAmt}>{money(totalAmount)}</Text>
          </View>
          <View style={styles.tTotal}>
            <Text style={[styles.cellDesc, styles.boldText]}>Amount Paid</Text>
            <Text style={[styles.cellAmt, styles.boldText, { color: '#047857' }]}>{money(paidAmount)}</Text>
          </View>
        </View>

        {notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        ) : null}

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <Text>Authorized Signatory</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Computer-generated receipt via YAA CRM. Issued on {pdfToday()}.</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
