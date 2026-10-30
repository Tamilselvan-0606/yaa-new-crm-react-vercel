import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { DocumentPrintOptions, numberToWordsIndian } from '../../../utils/printUtils';

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#FFFFFF',
  },
  // Top Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#33077C',
    paddingBottom: 12,
    marginBottom: 12,
  },
  companyCol: {
    width: '58%',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  companySubtitle: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#64748B',
    marginBottom: 2,
  },
  companyDetails: {
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: '#475569',
    lineHeight: 1.3,
  },
  docMetaCol: {
    width: '40%',
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
    textAlign: 'right',
  },
  docNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
    marginBottom: 4,
    textAlign: 'right',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaSmallText: {
    fontSize: 7.5,
    color: '#64748B',
    marginBottom: 1.5,
    textAlign: 'right',
  },

  // Party & Document Meta Grid
  billingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billingCol: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 3,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 1.5,
    lineHeight: 1.25,
  },
  metaItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  metaItemLabel: {
    fontSize: 8,
    color: '#64748B',
    fontFamily: 'Helvetica',
  },
  metaItemValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
  },

  // Items Table
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#33077C',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    minHeight: 20,
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    fontSize: 7.5,
    color: '#334155',
  },
  tableCellBold: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  tableCellSub: {
    fontSize: 6.5,
    color: '#64748B',
    marginTop: 1,
  },

  // Totals & Details Section
  bottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notesCol: {
    width: '54%',
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 7,
    marginBottom: 6,
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  notesBody: {
    fontSize: 7.5,
    color: '#64748B',
    lineHeight: 1.3,
  },
  inWordsText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
    marginTop: 3,
  },

  totalsCol: {
    width: '42%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalsLabel: {
    fontSize: 8,
    color: '#64748B',
  },
  totalsValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#33077C',
    paddingTop: 4,
    marginTop: 4,
    marginBottom: 3,
  },
  grandTotalLabel: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
  },
  paidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
  },
  paidLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#16A34A',
  },
  paidValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#16A34A',
  },
  balanceLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#D97706',
  },
  balanceValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#D97706',
  },

  // Signatures
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#CBD5E1',
  },
  signBox: {
    width: 140,
    borderTopWidth: 1,
    borderTopColor: '#475569',
    paddingTop: 4,
    textAlign: 'center',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 5,
    fontSize: 7,
    color: '#94A3B8',
  },
});

export const BusinessPDFDocument: React.FC<{ options: DocumentPrintOptions }> = ({ options }) => {
  const {
    docTypeTitle,
    docNo,
    docDate,
    dueDate,
    status = 'Active',
    statusColor = 'purple',
    referenceNo,
    companyName = 'YAA SALES & MART',
    companySubtitle = 'Wholesale & Retail Enterprise FMCG Distribution',
    companyAddress = '128 Commercial Boulevard, Tech Park, Chennai - 600001, Tamil Nadu',
    companyGstin = '33AAAAA0000A1Z5',
    companyPhone = '+91 98765 43210',
    companyEmail = 'billing@yaacreations.com',
    partyTitle = 'Billed To',
    partyName,
    partyCompany,
    partyPhone,
    partyEmail,
    partyAddress,
    partyGstin,
    extraMeta = [],
    items = [],
    subtotal,
    discount = 0,
    tax,
    shipping = 0,
    otherCharges = 0,
    roundOff,
    grandTotal,
    paidAmount,
    balance,
    paidAmountLabel = 'Amount Paid',
    balanceLabel = 'Balance Due',
    amountInWords,
    notes,
    terms,
    primarySignatoryLabel = 'Authorized Signatory',
    secondarySignatoryLabel,
  } = options;

  const resolvedInWords = amountInWords || numberToWordsIndian(grandTotal);

  const getBadgeStyle = () => {
    switch (statusColor) {
      case 'emerald':
        return { backgroundColor: '#ECFDF5', color: '#047857' };
      case 'amber':
        return { backgroundColor: '#FEF3C7', color: '#B45309' };
      case 'rose':
        return { backgroundColor: '#FFE4E6', color: '#BE123C' };
      case 'blue':
        return { backgroundColor: '#EFF6FF', color: '#1D4ED8' };
      default:
        return { backgroundColor: '#F3E8FF', color: '#6B21A8' };
    }
  };

  return (
    <Document title={`${docTypeTitle} - ${docNo}`} author={companyName}>
      <Page size="A4" style={styles.page}>
        {/* 1. Header Banner */}
        <View style={styles.headerRow}>
          <View style={styles.companyCol}>
            <Text style={styles.companyName}>{companyName}</Text>
            {companySubtitle ? <Text style={styles.companySubtitle}>{companySubtitle}</Text> : null}
            <Text style={styles.companyDetails}>{companyAddress}</Text>
            <Text style={styles.companyDetails}>
              GSTIN: {companyGstin} | Phone: {companyPhone}
            </Text>
            {companyEmail ? <Text style={styles.companyDetails}>Email: {companyEmail}</Text> : null}
          </View>
          <View style={styles.docMetaCol}>
            <Text style={styles.docTitle}>{docTypeTitle}</Text>
            <Text style={styles.docNumber}># {docNo}</Text>
            {status ? <Text style={[styles.badge, getBadgeStyle()]}>{status}</Text> : null}
            <Text style={styles.metaSmallText}>Date: {docDate}</Text>
            {dueDate ? <Text style={styles.metaSmallText}>Due Date: {dueDate}</Text> : null}
            {referenceNo ? <Text style={styles.metaSmallText}>Ref #: {referenceNo}</Text> : null}
          </View>
        </View>

        {/* 2. Billing & Party Grid */}
        <View style={styles.billingGrid}>
          <View style={styles.billingCol}>
            <Text style={styles.sectionTitle}>{partyTitle}</Text>
            <Text style={styles.partyName}>{partyName || 'N/A'}</Text>
            {partyCompany && partyCompany !== partyName ? (
              <Text style={styles.partyLine}>{partyCompany}</Text>
            ) : null}
            {partyAddress ? <Text style={styles.partyLine}>{partyAddress}</Text> : null}
            {partyPhone ? <Text style={styles.partyLine}>Phone: {partyPhone}</Text> : null}
            {partyEmail ? <Text style={styles.partyLine}>Email: {partyEmail}</Text> : null}
            {partyGstin ? <Text style={styles.partyLine}>GSTIN: {partyGstin}</Text> : null}
          </View>

          <View style={styles.billingCol}>
            <Text style={styles.sectionTitle}>Document Details</Text>
            <View style={styles.metaItemRow}>
              <Text style={styles.metaItemLabel}>Document No:</Text>
              <Text style={styles.metaItemValue}>{docNo}</Text>
            </View>
            <View style={styles.metaItemRow}>
              <Text style={styles.metaItemLabel}>Issue Date:</Text>
              <Text style={styles.metaItemValue}>{docDate}</Text>
            </View>
            {dueDate ? (
              <View style={styles.metaItemRow}>
                <Text style={styles.metaItemLabel}>Due Date:</Text>
                <Text style={styles.metaItemValue}>{dueDate}</Text>
              </View>
            ) : null}
            {extraMeta.map((em, i) => (
              <View style={styles.metaItemRow} key={i}>
                <Text style={styles.metaItemLabel}>{em.label}:</Text>
                <Text style={styles.metaItemValue}>{em.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3. Items Table */}
        {items.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '6%', textAlign: 'center' }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { width: '38%' }]}>Description</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Rate (Rs.)</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Disc %</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Tax %</Text>
              <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'right' }]}>Total (Rs.)</Text>
            </View>
            {items.map((it, idx) => (
              <View
                key={idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
              >
                <Text style={[styles.tableCell, { width: '6%', textAlign: 'center' }]}>
                  {idx + 1}
                </Text>
                <View style={{ width: '38%' }}>
                  <Text style={styles.tableCellBold}>{it.name}</Text>
                  {it.sku || it.batch ? (
                    <Text style={styles.tableCellSub}>
                      {[it.sku ? `SKU: ${it.sku}` : '', it.batch ? `Batch: ${it.batch}` : '']
                        .filter(Boolean)
                        .join(' | ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>
                  {it.quantity ?? 1} {it.unit || ''}
                </Text>
                <Text style={[styles.tableCell, { width: '14%', textAlign: 'right' }]}>
                  ₹{(Number(it.unitPrice) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>
                  {it.discountPercent ? `${it.discountPercent}%` : '-'}
                </Text>
                <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>
                  {it.taxPercent ? `${it.taxPercent}%` : '-'}
                </Text>
                <Text style={[styles.tableCellBold, { width: '12%', textAlign: 'right' }]}>
                  ₹{(Number(it.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 4. Notes & Summary Grid */}
        <View style={styles.bottomGrid}>
          <View style={styles.notesCol}>
            {resolvedInWords && (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Amount In Words</Text>
                <Text style={styles.inWordsText}>{resolvedInWords}</Text>
              </View>
            )}
            {notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Notes / Instructions</Text>
                <Text style={styles.notesBody}>{notes}</Text>
              </View>
            ) : null}
            {terms ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Terms & Conditions</Text>
                <Text style={styles.notesBody}>{terms}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.totalsCol}>
            {subtotal !== undefined && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Sub Total:</Text>
                <Text style={styles.totalsValue}>
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}
            {discount ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount:</Text>
                <Text style={[styles.totalsValue, { color: '#EA580C' }]}>
                  -₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ) : null}
            {tax && (
              <>
                {tax.cgst ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>CGST:</Text>
                    <Text style={styles.totalsValue}>
                      ₹{tax.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                ) : null}
                {tax.sgst ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>SGST:</Text>
                    <Text style={styles.totalsValue}>
                      ₹{tax.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                ) : null}
                {tax.igst ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>IGST:</Text>
                    <Text style={styles.totalsValue}>
                      ₹{tax.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                ) : null}
                {!tax.cgst && !tax.sgst && !tax.igst && tax.taxAmount ? (
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Total Tax / GST:</Text>
                    <Text style={styles.totalsValue}>
                      ₹{tax.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
            {shipping ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Shipping / Freight:</Text>
                <Text style={styles.totalsValue}>
                  ₹{shipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ) : null}
            {otherCharges ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Other Charges:</Text>
                <Text style={styles.totalsValue}>
                  ₹{otherCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ) : null}
            {roundOff !== undefined && roundOff !== 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Round Off:</Text>
                <Text style={styles.totalsValue}>
                  ₹{roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ) : null}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalValue}>
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {paidAmount !== undefined && (
              <View style={styles.paidRow}>
                <Text style={styles.paidLabel}>{paidAmountLabel}:</Text>
                <Text style={styles.paidValue}>
                  ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}
            {balance !== undefined && (
              <View style={styles.paidRow}>
                <Text style={styles.balanceLabel}>{balanceLabel}:</Text>
                <Text style={styles.balanceValue}>
                  ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 5. Signatures */}
        <View style={styles.signaturesRow}>
          {secondarySignatoryLabel ? (
            <View style={styles.signBox}>
              <Text>{secondarySignatoryLabel}</Text>
            </View>
          ) : (
            <View style={{ width: 140 }} />
          )}
          <View style={styles.signBox}>
            <Text>{primarySignatoryLabel}</Text>
          </View>
        </View>

        {/* 6. Footer Notice */}
        <View style={styles.footer} fixed>
          <Text>
            Computer-generated document via YAA CRM. Issued on {new Date().toLocaleDateString('en-IN')}.
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
