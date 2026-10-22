// Centralized API Exports
export * from './config';
export * from './baseApi';
export * from './crm/crmApi';
export * from './auth/authApi';
export * from './auth/authSliceApi';
export * from './auth/authTypes';
export * from './platform/organizationApi';
export * from './platform/organizationTypes';
export * from './platform/subOrganizationApi';
export * from './platform/subOrganizationTypes';
export * from './platform/subscriptionPlanApi';
export * from './platform/subscriptionPlanTypes';
export * from './platform/organizationSubscriptionApi';
export * from './platform/organizationSubscriptionTypes';
export * from './platform/quoteApi';
export * from './platform/quoteTypes';
export * from './platform/proformaInvoiceApi';
export * from './platform/proformaInvoiceTypes';
export * from './platform/invoiceApi';
export * from './platform/invoiceTypes';
export * from './platform/branchApi';
export * from './platform/branchTypes';
export * from './platform/clientSubscriptionApi';
export * from './platform/clientSubscriptionTypes';
export * from './platform/productPlanApi';
export * from './platform/productPlanTypes';
export * from './platform/clientProductApi';
export * from './platform/clientProductTypes';
export * from './platform/leadApi';
export * from './platform/leadTypes';
export * from './platform/clientApi';
export * from './platform/clientTypes';

export * from './commerce/customerTypes';
export * from './commerce/customerApi';
export {
  customerApi,
  mapApiCustomerToSalesCustomer,
  mapSalesCustomerToPayload,
} from './commerce/customerApi';
export * from './commerce/categoryTypes';
export * from './commerce/categoryApi';
export {
  categoryApi,
  mapApiCategoryToCategoryItem,
} from './commerce/categoryApi';
export * from './commerce/subcategoryTypes';
export * from './commerce/subcategoryApi';
export {
  subcategoryApi,
  mapApiSubcategoryToSubcategoryItem,
} from './commerce/subcategoryApi';
export * from './commerce/unitTypes';
export * from './commerce/unitApi';
export {
  unitApi,
  mapApiUnitToUnitItem,
} from './commerce/unitApi';
export * from './commerce/productTypes';
export * from './commerce/productApi';
export {
  productApi,
  mapApiProductToProductItem,
  mapProductItemToPayload,
} from './commerce/productApi';
export * from './commerce/stockTypes';
export * from './commerce/stockApi';
export {
  stockApi,
  mapApiStockToInventoryStockItem,
  mapApiStockBatchToStockBatch,
} from './commerce/stockApi';
export * from './commerce/quotationTypes';
export * from './commerce/quotationApi';
export {
  quotationApi,
  mapApiQuotationToSaleQuotation,
  mapSaleQuotationToPayload,
} from './commerce/quotationApi';

export type {
  ApiProformaInvoice,
  ApiProformaInvoiceItem,
  ApiProformaInvoiceCustomer,
  ProformaFilterParams,
  ConvertProformaPayload,
  ConvertProformaResponse,
  CreateProformaPayload,
  UpdateProformaPayload,
  PatchProformaPayload,
  ProformaStatusUpdatePayload,
} from './commerce/proformaTypes';
export type {
  ExtendedProformaItem,
  SaleProformaInvoice,
} from './commerce/proformaApi';
export {
  commerceProformaApi,
  commerceProformaEndpoints,
  mapApiProformaItemToSaleProductItem,
  mapApiProformaToSaleProforma,
  mapSaleProformaToPayload,
  UUID_REGEX,
} from './commerce/proformaApi';

export * from './commerce/saleOrderTypes';
export * from './commerce/saleOrderApi';
export {
  commerceSaleOrderApi,
  commerceSaleOrderEndpoints,
  mapApiSaleOrderItemToSaleProductItem,
  mapApiSaleOrderToSaleOrderRecord,
  mapSaleOrderRecordToPayload,
} from './commerce/saleOrderApi';

export * from './commerce/deliveryChallanTypes';
export * from './commerce/deliveryChallanApi';
export {
  commerceDeliveryChallanApi,
  commerceDeliveryChallanEndpoints,
  mapApiDeliveryChallanItemToExtendedItem,
  mapApiDeliveryChallanToRecord,
  mapDeliveryChallanRecordToPayload,
} from './commerce/deliveryChallanApi';

export * from './commerce/invoiceTypes';
export * from './commerce/invoiceApi';
export {
  commerceInvoiceApi,
  commerceSalesInvoiceEndpoints,
  mapApiInvoiceItemToSaleProductItem,
  mapApiPaymentToSalePaymentRecord,
  mapApiInvoiceToSaleTransaction,
  mapSaleTransactionToInvoicePayload,
} from './commerce/invoiceApi';

export * from './commerce/paymentInTypes';
export * from './commerce/paymentInApi';
export {
  commercePaymentInApi,
  commercePaymentInEndpoints,
  mapApiPaymentInToSalePaymentIn,
  mapSalePaymentInToApiPayload,
} from './commerce/paymentInApi';

export * from './commerce/salesReturnTypes';
export * from './commerce/salesReturnApi';
export {
  commerceSalesReturnApi,
  commerceSalesReturnEndpoints,
  mapApiReturnItemToSalesReturnItem,
  mapApiSalesReturnToSalesReturn,
  mapSalesReturnToApiPayload,
} from './commerce/salesReturnApi';

export * from './commerce/supplierTypes';
export * from './commerce/supplierApi';
export {
  supplierApi,
  supplierEndpoints,
  mapApiSupplierToSupplier,
  mapSupplierToPayload,
} from './commerce/supplierApi';

export * from './commerce/purchaseRequestTypes';
export {
  commercePurchaseRequestApi,
  commercePurchaseRequestEndpoints,
  mapApiPurchaseRequestToUi,
} from './commerce/purchaseRequestApi';

export * from './commerce/purchaseReturnTypes';
export {
  commercePurchaseReturnApi,
  commercePurchaseReturnEndpoints,
  mapApiPurchaseReturnToUi,
} from './commerce/purchaseReturnApi';

export * from './work/purchaseOrderTypes';
export {
  workPurchaseOrderApi,
  workPurchaseOrderEndpoints,
  mapApiPurchaseOrderToUi,
  mapUiToCreatePurchaseOrderPayload,
  mapUiToUpdatePurchaseOrderPayload,
  mapApiItemToUiProductItem,
} from './work/purchaseOrderApi';

export * from './work/paymentOutTypes';
export {
  workPaymentOutApi,
  workPaymentOutEndpoints,
  mapApiPaymentOutToUi,
  mapUiToCreatePaymentOutPayload,
  mapUiToUpdatePaymentOutPayload,
} from './work/paymentOutApi';

export * from './work/expenseTypes';
export {
  workExpenseApi,
  workExpenseCategoryApi,
  workExpenseEndpoints,
  mapApiExpenseToUi,
  mapUiToCreateExpensePayload,
  mapUiToUpdateExpensePayload,
  normalizePaymentMode,
  normalizePaymentMethodForApi,
  isValidUuid,
  ensureValidUuid,
} from './work/expenseApi';

export * from './commerce/collectionTypes';
export { collectionApi } from './commerce/collectionApi';

export * from './commerce/salesDashboardTypes';
export * from './commerce/salesDashboardApi';
export * from './ai/aiApi';
