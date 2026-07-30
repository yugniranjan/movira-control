import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout, tokenRefreshed } from "../features/auth/authSlice";
import { resolveApiBaseUrl } from "./resolveApiBaseUrl";
import { refreshAccessToken } from "./authSession";

const API_BASE_URL = resolveApiBaseUrl();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const skipJsonContentType =
      headers.get("x-skip-json-content-type") === "true";
    headers.delete("x-skip-json-content-type");
    if (!skipJsonContentType) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  },
});

function normalizeApiErrorPayload(data, fallbackStatus) {
  const source =
    data && typeof data === "object" && !Array.isArray(data)
      ? data
      : { error: data };
  const errors = Array.isArray(source.errors)
    ? source.errors.filter(Boolean).map((item) => String(item))
    : [];
  const details = source.details !== undefined ? source.details : errors;
  const messageCandidates = [
    source.message,
    source.error,
    typeof details === "string" ? details : null,
    Array.isArray(details) && details.length > 0 ? details.join(" | ") : null,
    errors.length > 0 ? errors.join(" | ") : null,
  ].filter(Boolean);

  return {
    success: false,
    statusCode: source.statusCode || fallbackStatus || 500,
    message: messageCandidates[0] || "Request failed",
    error: source.error || messageCandidates[0] || "Request failed",
    details,
    errors,
    ...source,
  };
}

export const customBaseQuery = async (args, api, extraOptions) => {
  const tokenAtRequestStart = api.getState()?.auth?.token || null;

  // normalize request
  let request = typeof args === "string" ? { url: args } : { ...args };
  let { url, body, ...rest } = request;
  const requestUrl = String(url || "");

  let result;

  try {
    if (extraOptions?.isFormData) {
      result = await rawBaseQuery(
        {
          ...rest,
          url,
          body,
          headers: {
            ...(rest.headers || {}),
            "x-skip-json-content-type": "true",
          },
        },
        api,
        extraOptions
      );
    } else if (body && body.json && (body.image || body.files)) {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(body.json));

      if (Array.isArray(body.image)) {
        body.image.forEach((imgObj) => {
          Object.entries(imgObj).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach((file, fIdx) => {
                if (file instanceof File) {
                  formData.append(`${key}[${fIdx}]`, file);
                }
              });
            } else if (value instanceof File) {
              formData.append(key, value);
            }
          });
        });
      }

      result = await rawBaseQuery(
        {
          ...rest,
          url,
          body: formData,
          headers: { "x-skip-json-content-type": "true" },
        },
        api,
        { ...extraOptions, isFormData: true }
      );
    } else {
      result = await rawBaseQuery({ ...rest, url, body }, api, extraOptions);
    }
  } catch (err) {
    console.error("Base query error:", err);
    result = { error: err };
  }

  // handle unauthorized globally
  if (result?.error) {
    result.error.data = normalizeApiErrorPayload(
      result.error.data,
      result.error.status
    );
  }

  if (result?.error?.status === 401) {
    const currentToken = api.getState()?.auth?.token || null;
    const isAuthEndpoint = requestUrl.startsWith("/auth/");
    if (isAuthEndpoint || !tokenAtRequestStart || !currentToken) return result;

    if (
      currentToken !== tokenAtRequestStart &&
      !extraOptions?.__authRetried
    ) {
      return customBaseQuery(args, api, {
        ...extraOptions,
        __authRetried: true,
      });
    }

    const refreshedToken = extraOptions?.__authRetried
      ? null
      : await refreshAccessToken();
    if (refreshedToken) {
      api.dispatch(tokenRefreshed({ token: refreshedToken }));
      return customBaseQuery(args, api, {
        ...extraOptions,
        __authRetried: true,
      });
    }

    api.dispatch(logout());
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: customBaseQuery,
  tagTypes: [
    "Booking",
    "Roles",
    "Permissions",
    "Users",
    "Activity",
    "JumpPass",
    "JumpPasses",
    "JumpPassMeta",
    "PartyBundle",
    "ZonesAreas",
    "Parks",
    "ActivityTypes",
    "RolePermissions",
    "Inventory",
    "Promo",
    "SessionPlanner",
    "Wristband",
    "Wristbands",
    "WristbandSchedule",
    "Bookings",
    "Payment",
    "payment",
    "TaxRates",
    "Waivers",
    "BookingPortals",
    "PosTemplate",
    "PresetBuilder",
    "PosDevice",
    "PosSettings",
    "Customers",
    "CustomerForms",
    "OperatingHours",
    "SpecialHours",
    "EmailSummary",
    "EmailQueue",
    "EmailDLQ",
    "Docs",
    "Tickets",
    "CheckIn",
    "Branding",
    "BrandingRegistry",
    "EmailTemplate",
    "Uis",
    "VoucherPack",
    "Membership",
    "GiftCard",
    "StaffSchedule",
    "DashboardAnalytics",
    "Support",
    "Timesheet",
    "TimeOff",
    "ScheduleMarket",
    "TeamChat",
    "HrDoc",
    "StaffReport",
    "ScheduleConfig",
    "SaasControl",
    "BusinessCalendar",
    "TipReport",
    "TipDistribution",
    "BookingStaff",
  ],
  endpoints: () => ({}),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
});
