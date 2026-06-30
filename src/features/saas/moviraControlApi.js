import { baseApi } from "../../api/baseApi";

export const moviraControlApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSaasParks: builder.query({
      query: ({ page = 1, limit = 12, search = "", includeArchived = false, status = "active", organizationId = "" } = {}) => ({
        url: "/saas/parks",
        params: { page, limit, search, includeArchived, status, organizationId },
      }),
      providesTags: ["SaasControl"],
      transformResponse: (response) => response?.data || response || {},
    }),
    getSaasParkById: builder.query({
      query: (id) => `/saas/parks/${id}`,
      providesTags: (result, error, id) => [{ type: "SaasControl", id }],
      transformResponse: (response) => response?.data || response,
    }),
    getSaasParkAuditLogs: builder.query({
      query: ({ id, page = 1, limit = 25, search = "", action = "all", from = "", to = "" } = {}) => ({
        url: `/saas/parks/${id}/audit`,
        params: { page, limit, search, action, from, to },
      }),
      providesTags: (result, error, { id } = {}) => [{ type: "SaasControl", id: `audit-${id}` }],
      transformResponse: (response) => response?.data || response || {},
    }),
    getSaasParkPaymentEvents: builder.query({
      query: ({ id, page = 1, limit = 25, search = "", status = "all", eventType = "all", from = "", to = "" } = {}) => ({
        url: `/saas/parks/${id}/payment-events`,
        params: { page, limit, search, status, eventType, from, to },
      }),
      providesTags: (result, error, { id } = {}) => [{ type: "SaasControl", id: `payment-events-${id}` }],
      transformResponse: (response) => response?.data || response || {},
    }),
    createSaasPark: builder.mutation({
      query: (body) => ({
        url: "/saas/parks",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SaasControl", "Parks"],
    }),
    createSaasCustomerOwner: builder.mutation({
      query: (body) => ({
        url: "/saas/customer-owners",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
      transformResponse: (response) => response?.data || response,
    }),
    updateSaasPark: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/saas/parks/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["SaasControl", "Parks", { type: "SaasControl", id }, { type: "SaasControl", id: `audit-${id}` }],
    }),
    updateSaasParkModules: builder.mutation({
      query: ({ id, modules }) => ({
        url: `/saas/parks/${id}/modules`,
        method: "PATCH",
        body: { modules },
      }),
      invalidatesTags: (result, error, { id }) => ["SaasControl", { type: "SaasControl", id }, { type: "SaasControl", id: `audit-${id}` }],
    }),
    updateSaasParkTicketControls: builder.mutation({
      query: ({ id, ticketControls }) => ({
        url: `/saas/parks/${id}/ticket-controls`,
        method: "PATCH",
        body: { ticketControls },
      }),
      invalidatesTags: (result, error, { id }) => ["SaasControl", { type: "SaasControl", id }, { type: "SaasControl", id: `audit-${id}` }],
    }),
    updateSaasParkPayments: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/saas/parks/${id}/payments`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "SaasControl",
        { type: "SaasControl", id },
        { type: "SaasControl", id: `audit-${id}` },
        { type: "SaasControl", id: `payment-events-${id}` },
      ],
    }),
    getPaymentProviderSchemas: builder.query({
      query: () => "/payments/config/providers/schemas",
      providesTags: ["Payment"],
      transformResponse: (response) => response?.data || response || {},
    }),
    getPaymentCompatibility: builder.query({
      query: () => "/payments/config/compatibility",
      providesTags: ["Payment"],
      transformResponse: (response) => response?.data || response || {},
    }),
    getPaymentCredentials: builder.query({
      query: () => "/payments/config/credentials",
      providesTags: ["Payment"],
      transformResponse: (response) => response?.data || response || [],
    }),
    createPaymentCredential: builder.mutation({
      query: (body) => ({
        url: "/payments/config/credentials",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payment"],
      transformResponse: (response) => response?.data || response,
    }),
    updatePaymentCredential: builder.mutation({
      query: ({ credentialId, ...body }) => ({
        url: `/payments/config/credentials/${credentialId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Payment"],
      transformResponse: (response) => response?.data || response,
    }),
    deletePaymentCredential: builder.mutation({
      query: (credentialId) => ({
        url: `/payments/config/credentials/${credentialId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Payment"],
    }),
    testPaymentCredential: builder.mutation({
      query: (body) => ({
        url: "/payments/config/test-connection",
        method: "POST",
        body,
      }),
    }),
    getVenuePaymentRoutes: builder.query({
      query: (locationId) => `/payments/config/routes/venue/${locationId}`,
      providesTags: (result, error, locationId) => [{ type: "Payment", id: `routes-${locationId}` }],
      transformResponse: (response) => response?.data || response || {},
    }),
    upsertVenuePaymentRoute: builder.mutation({
      query: ({ locationId, channel, ...body }) => ({
        url: `/payments/config/routes/venue/${locationId}/${channel}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => ["Payment", { type: "Payment", id: `routes-${locationId}` }],
      transformResponse: (response) => response?.data || response,
    }),
    deleteVenuePaymentRoute: builder.mutation({
      query: ({ locationId, channel }) => ({
        url: `/payments/config/routes/venue/${locationId}/${channel}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { locationId }) => ["Payment", { type: "Payment", id: `routes-${locationId}` }],
    }),
    getVenuePosTree: builder.query({
      query: (locationId) => `/payments/config/venues/${locationId}/pos-tree`,
      providesTags: (result, error, locationId) => [{ type: "Payment", id: `pos-${locationId}` }],
      transformResponse: (response) => response?.data || response || { routed: false, terminals: [] },
    }),
    createVenueTerminal: builder.mutation({
      query: ({ locationId, name }) => ({
        url: "/pos/devices",
        method: "POST",
        body: { locationId, name },
      }),
      invalidatesTags: (result, error, { locationId }) => [{ type: "Payment", id: `pos-${locationId}` }],
      transformResponse: (response) => response?.data || response,
    }),
    regenerateVenueTerminalPairing: builder.mutation({
      query: (posDeviceId) => ({
        url: `/pos/devices/${posDeviceId}/regenerate-pairing-code`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["Payment"],
      transformResponse: (response) => response?.data || response,
    }),
    addVenueReader: builder.mutation({
      query: ({ locationId, posDeviceId, ...body }) => ({
        url: `/payments/config/venues/${locationId}/terminals/${posDeviceId}/readers`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => [{ type: "Payment", id: `pos-${locationId}` }],
      transformResponse: (response) => response?.data || response,
    }),
    updateVenueReader: builder.mutation({
      query: ({ terminalId, locationId, ...body }) => ({
        url: `/payments/config/readers/${terminalId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { locationId }) => (locationId ? [{ type: "Payment", id: `pos-${locationId}` }] : ["Payment"]),
      transformResponse: (response) => response?.data || response,
    }),
    deleteVenueReader: builder.mutation({
      query: ({ terminalId }) => ({
        url: `/payments/config/readers/${terminalId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { locationId }) => (locationId ? [{ type: "Payment", id: `pos-${locationId}` }] : ["Payment"]),
    }),
    updateSaasParkBilling: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/saas/parks/${id}/billing`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["SaasControl", { type: "SaasControl", id }, { type: "SaasControl", id: `audit-${id}` }],
    }),
    recordSaasInvoicePayment: builder.mutation({
      query: ({ id, invoiceId, ...body }) => ({
        url: `/saas/parks/${id}/invoices/${invoiceId}/payments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "SaasControl",
        { type: "SaasControl", id },
        { type: "SaasControl", id: `audit-${id}` },
        { type: "SaasControl", id: `payment-events-${id}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    createSaasInvoicePaymentLink: builder.mutation({
      query: ({ id, invoiceId, ...body }) => ({
        url: `/saas/parks/${id}/invoices/${invoiceId}/payment-link`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "SaasControl",
        { type: "SaasControl", id },
        { type: "SaasControl", id: `audit-${id}` },
        { type: "SaasControl", id: `payment-events-${id}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    refreshSaasInvoiceLifecycle: builder.mutation({
      query: ({ id, asOf } = {}) => ({
        url: `/saas/parks/${id}/invoices/lifecycle/refresh`,
        method: "POST",
        body: asOf ? { asOf } : {},
      }),
      invalidatesTags: (result, error, { id }) => [
        "SaasControl",
        { type: "SaasControl", id },
        { type: "SaasControl", id: `audit-${id}` },
        { type: "SaasControl", id: `payment-events-${id}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    voidSaasInvoice: builder.mutation({
      query: ({ id, invoiceId, reason }) => ({
        url: `/saas/parks/${id}/invoices/${invoiceId}/void`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        "SaasControl",
        { type: "SaasControl", id },
        { type: "SaasControl", id: `audit-${id}` },
        { type: "SaasControl", id: `payment-events-${id}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    refundSaasInvoicePayment: builder.mutation({
      query: ({ id, invoiceId, amount, reason, idempotencyKey }) => ({
        url: `/saas/parks/${id}/invoices/${invoiceId}/refunds`,
        method: "POST",
        body: { amount, reason, idempotencyKey },
      }),
      invalidatesTags: (result, error, { id }) => [
        "SaasControl",
        { type: "SaasControl", id },
        { type: "SaasControl", id: `audit-${id}` },
        { type: "SaasControl", id: `payment-events-${id}` },
      ],
      transformResponse: (response) => response?.data || response,
    }),
    getSaasInvoiceDocument: builder.query({
      query: ({ id, invoiceId }) => ({
        url: `/saas/parks/${id}/invoices/${invoiceId}/document`,
        responseHandler: (response) => response.text(),
      }),
    }),
    updateSaasParkOnboarding: builder.mutation({
      query: ({ id, onboarding, ticketControls }) => ({
        url: `/saas/parks/${id}/onboarding`,
        method: "PATCH",
        body: { onboarding, ticketControls },
      }),
      invalidatesTags: (result, error, { id }) => ["SaasControl", { type: "SaasControl", id }, { type: "SaasControl", id: `audit-${id}` }],
    }),
    deleteSaasPark: builder.mutation({
      query: (id) => ({
        url: `/saas/parks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SaasControl", "Parks"],
    }),
    getSaasParkPermanentDeletePreview: builder.query({
      query: (id) => `/saas/parks/${id}/permanent-preview`,
      transformResponse: (response) => response?.data || response,
    }),
    permanentDeleteSaasPark: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/saas/parks/${id}/permanent`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["SaasControl", "Parks"],
    }),
    updateSaasParkLifecycle: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/saas/parks/${id}/lifecycle`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["SaasControl", "Parks", { type: "SaasControl", id }, { type: "SaasControl", id: `audit-${id}` }],
      transformResponse: (response) => response?.data || response,
    }),
    approveSaasParkGoLive: builder.mutation({
      query: ({ id, approvedBy }) => ({
        url: `/saas/parks/${id}/go-live`,
        method: "POST",
        body: { approvedBy },
      }),
      invalidatesTags: (result, error, { id }) => ["SaasControl", { type: "SaasControl", id }, { type: "SaasControl", id: `audit-${id}` }],
    }),
  }),
});

export const {
  useGetSaasParksQuery,
  useGetSaasParkByIdQuery,
  useGetSaasParkAuditLogsQuery,
  useGetSaasParkPaymentEventsQuery,
  useCreateSaasParkMutation,
  useCreateSaasCustomerOwnerMutation,
  useUpdateSaasParkMutation,
  useUpdateSaasParkModulesMutation,
  useUpdateSaasParkTicketControlsMutation,
  useUpdateSaasParkPaymentsMutation,
  useGetPaymentProviderSchemasQuery,
  useGetPaymentCompatibilityQuery,
  useGetPaymentCredentialsQuery,
  useCreatePaymentCredentialMutation,
  useUpdatePaymentCredentialMutation,
  useDeletePaymentCredentialMutation,
  useTestPaymentCredentialMutation,
  useGetVenuePaymentRoutesQuery,
  useUpsertVenuePaymentRouteMutation,
  useDeleteVenuePaymentRouteMutation,
  useGetVenuePosTreeQuery,
  useCreateVenueTerminalMutation,
  useRegenerateVenueTerminalPairingMutation,
  useAddVenueReaderMutation,
  useUpdateVenueReaderMutation,
  useDeleteVenueReaderMutation,
  useUpdateSaasParkBillingMutation,
  useRecordSaasInvoicePaymentMutation,
  useCreateSaasInvoicePaymentLinkMutation,
  useRefreshSaasInvoiceLifecycleMutation,
  useVoidSaasInvoiceMutation,
  useRefundSaasInvoicePaymentMutation,
  useLazyGetSaasInvoiceDocumentQuery,
  useUpdateSaasParkOnboardingMutation,
  useDeleteSaasParkMutation,
  useLazyGetSaasParkPermanentDeletePreviewQuery,
  usePermanentDeleteSaasParkMutation,
  useUpdateSaasParkLifecycleMutation,
  useApproveSaasParkGoLiveMutation,
} = moviraControlApi;
