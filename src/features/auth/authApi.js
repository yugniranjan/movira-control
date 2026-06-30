import { baseApi } from "../../api/baseApi";
import { loginSuccess, logout } from "./authSlice";
import Cookies from "js-cookie";

const LAST_LOCATION_KEY = "lastSelectedLocation";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const locations = data.locations || [];
          let preferredLocation = locations[0] || null;

          try {
            const persistedLocation = JSON.parse(
              localStorage.getItem(LAST_LOCATION_KEY) || "null"
            );
            if (persistedLocation?.locationId) {
              preferredLocation =
                locations.find(
                  (location) =>
                    String(location.locationId) === String(persistedLocation.locationId)
                ) || preferredLocation;
            }
          } catch (error) {
            console.error("Failed to restore last location:", error);
          }

          if (preferredLocation) {
            Cookies.set("locationId", preferredLocation.locationId, { expires: 2 / 24 });
            Cookies.set("state", preferredLocation.stateOrProvince || "Unknown", {
              expires: 2 / 24,
            });
            localStorage.setItem(
              LAST_LOCATION_KEY,
              JSON.stringify({
                locationId: preferredLocation.locationId,
                stateOrProvince: preferredLocation.stateOrProvince || "",
              })
            );
          }

          dispatch(
            loginSuccess({
              token: data.token,
              user: data.user,
              sidebar: data.sidebar || [],
              permissions: data.permissions || [],
              allowedRoutes: data.allowedRoutes || [],
              locations: data.locations || [],
            })
          );
        } catch (error) {
          console.error("Login failed:", error);
        }
      },
    }),
    refreshToken: builder.mutation({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(logout());
        } catch {
          /* empty */
        }
      },
    }),
  }),
});

export const { useLoginMutation, useRefreshTokenMutation, useLogoutMutation } =
  authApi;
