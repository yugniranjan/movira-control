import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { decryptWithAES, encryptWithAES } from "../utils/secureCrypto";
import { logout } from "../features/auth/authSlice";
import Cookies from "js-cookie";
import { resolveApiBaseUrl } from "./resolveApiBaseUrl";

const API_BASE_URL = resolveApiBaseUrl();

function appendQueryParam(url, key, value) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

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

export const customEncryptedBaseQuery = async (args, api, extraOptions) => {
  // Encrypt ONLY in production builds. import.meta.env.PROD is set by Vite
  // automatically: true for "vite build" (prod), false for the "vite" dev
  // server — so the dev server never encrypts, regardless of any .env toggle.
  const isProduction = import.meta.env.PROD;
  const locationId = Cookies.get("locationId");
  const tokenAtRequestStart = api.getState()?.auth?.token || null;

  // normalize request
  let request = typeof args === "string" ? { url: args } : { ...args };
  let { url, body, ...rest } = request;
  const requestUrl = String(url || "");

  // always add locationId
  if (locationId) {
    try {
      if (isProduction) {
        const encryptedLocationId = await encryptWithAES({ locationId });
        url = appendQueryParam(url, "encrypted", encryptedLocationId.encrypted);
        url = appendQueryParam(url, "iv", encryptedLocationId.iv);
      } else {
        url = appendQueryParam(url, "locationId", locationId);
      }
    } catch (err) {
      console.error("LocationId encryption error:", err);
    }
  }

  let result;

  try {
    // --- Case 1: FormData ---
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

      const encryptedJson = isProduction
        ? await encryptWithAES(body.json)
        : body.json;
      formData.append("payload", JSON.stringify(encryptedJson));

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

    // --- Case 2: JSON body ---
    } else if (body) {
      const requestBody = isProduction
        ? await encryptWithAES(body)
        : body;
      result = await rawBaseQuery({ ...rest, url, body: requestBody }, api, extraOptions);

    // --- Case 3: GET ---
    } else {
      result = await rawBaseQuery({ ...rest, url }, api, extraOptions);
    }

    // decrypt if needed
    if (isProduction && result?.data?.encrypted && result?.data?.iv) {
      result.data = await decryptWithAES(result.data);
    }

  } catch (err) {
    console.error("Base query error:", err);
    result = { error: err };
  }

  // In production the backend encrypts error bodies (4xx/5xx) just like
  // success bodies, so decrypt before normalizing — otherwise every prod
  // error is masked as the generic "Request failed" fallback. The decryption
  // middleware's own 400s are plaintext (no encrypted/iv keys), so the guard
  // skips them, and the try/catch tolerates anything that won't decrypt.
  if (isProduction && result?.error?.data?.encrypted && result?.error?.data?.iv) {
    try {
      result.error.data = await decryptWithAES(result.error.data);
    } catch (decErr) {
      console.error("Error-response decryption failed:", decErr);
    }
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
    const shouldLogoutCurrentSession =
      tokenAtRequestStart &&
      currentToken &&
      currentToken === tokenAtRequestStart &&
      !isAuthEndpoint;

    if (!shouldLogoutCurrentSession) {
      return result;
    }

    api.dispatch(logout());
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: customEncryptedBaseQuery,
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
