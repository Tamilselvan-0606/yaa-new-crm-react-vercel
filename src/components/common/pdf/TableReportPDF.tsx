import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { PrintTableOptions } from '../../../utils/printUtils';

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#FFFFFF',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#33077C',
    paddingBottom: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    width: '60%',
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
    marginBottom: 2,
  },
  companyDetails: {
    fontSize: 7.5,
    color: '#64748B',
  },
  reportMetaCol: {
    width: '38%',
    alignItems: 'flex-end',
  },
  reportTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    textAlign: 'right',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 7.5,
    color: '#64748B',
    textAlign: 'right',
    marginBottom: 2,
  },
  generatedDate: {
    fontSize: 7,
    color: '#94A3B8',
    textAlign: 'right',
  },

  // Metrics Grid
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 6,
    minWidth: 100,
  },
  metricLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
  },

  // Table
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
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    fontSize: 7,
    color: '#334155',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderTopWidth: 1.5,
    borderTopColor: '#33077C',
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  summaryCell: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#33077C',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 4,
    fontSize: 6.5,
    color: '#94A3B8',
  },
});

export const TableReportPDF: React.FC<{ options: PrintTableOptions }> = ({ options }) => {
  const {
    title,
    subtitle,
    companyName = 'Yaa Creations Inc.',
    companyDetails = 'Enterprise CRM & Sales Management Division | support@yaacreations.com',
    columns,
    data,
    summaryRow,
    metrics,
    orientation = 'landscape',
    footerNote = 'Confidential & Proprietary • Generated automatically by YAA CRM',
  } = options;

  const colWidth = `${Math.floor(100 / columns.length)}%`;

  return (
    <Document title={title} author={companyName}>
      <Page size="A4" orientation={orientation} style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleCol}>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetails}>{companyDetails}</Text>
          </View>
          <View style={styles.reportMetaCol}>
            <Text style={styles.reportTitle}>{title}</Text>
            {subtitle ? <Text style={styles.reportSubtitle}>{subtitle}</Text> : null}
            <Text style={styles.generatedDate}>
              Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
            </Text>
          </View>
        </View>

        {metrics && metrics.length > 0 && (
          <View style={styles.metricsRow}>
            {metrics.map((m, i) => (
              <View key={i} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={styles.metricValue}>
                  {typeof m.value === 'number' ? `₹${m.value.toLocaleString('en-IN')}` : m.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            {columns.map((col, i) => {
              const align = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
              return (
                <Text
                  key={i}
                  style={[
                    styles.tableHeaderCell,
                    {
                      width: col.width || colWidth,
                      textAlign: align,
                    },
                  ]}
                >
                  {col.header}
                </Text>
              );
            })}
          </View>

          {data.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={[styles.tableRow, rowIdx % 2 === 1 ? styles.tableRowEven : {}]}
            >
              {columns.map((col, colIdx) => {
                const align = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
                let val = row[col.key];
                if (val === undefined || val === null) val = '-';
                if (col.type === 'currency' && typeof val === 'number') {
                  val = `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                } else if (typeof val === 'number') {
                  val = val.toLocaleString('en-IN');
                }
                return (
                  <Text
                    key={colIdx}
                    style={[
                      styles.tableCell,
                      {
                        width: col.width || colWidth,
                        textAlign: align,
                      },
                    ]}
                  >
                    {String(val)}
                  </Text>
                );
              })}
            </View>
          ))}

          {summaryRow && (
            <View style={styles.summaryRow}>
              {columns.map((col, colIdx) => {
                const align = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
                let val = summaryRow[col.key];
                if (val === undefined || val === null) val = '';
                if (typeof val === 'number') {
                  val = `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                }
                return (
                  <Text
                    key={colIdx}
                    style={[
                      styles.summaryCell,
                      {
                        width: col.width || colWidth,
                        textAlign: align,
                      },
                    ]}
                  >
                    {String(val)}
                  </Text>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{footerNote}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
