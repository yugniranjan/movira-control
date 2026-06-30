import { baseApi } from "../../api/baseApi";

export const userApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAllUsers: builder.query({
            query: ({search}) => ({ url: "/user/users", params: {search} }),
            providesTags: ["Users"],
        }),
        // Location-scoped staff. posOnly=false (default) → all venue staff
        // (ROLLER's "Assign staff" list — a host need not run the till).
        // posOnly=true → only is_pos_user (till staff who earn/share tips).
        // Returns { success, data: [{ userId, firstName, lastName, email, role, isPosUser }] }.
        getVenueStaff: builder.query({
            query: ({ posOnly = false } = {}) => ({
                url: "/user/users/venue-staff",
                params: posOnly ? { posOnly: true } : {},
            }),
            providesTags: ["Users"],
        }),
        getUserById: builder.query({
            query: (id) => `/user/users/${id}`,
            providesTags: (result, error, id) => [{ type: "Users", id }],
        }),
        createUser: builder.mutation({
            query: (userData) => ({
                url: "/user/users",
                method: "POST",
                body: userData,
            }),
            invalidatesTags: ["Users"],
        }),
        updateUser: builder.mutation({
            query: ({ id, ...userData }) => ({
                url: `/user/users/${id}`,
                method: "PUT",
                body: userData,
            }),
            invalidatesTags: ["Users"],
        }),
        deleteUser: builder.mutation({
            query: (id) => ({
                url: `/user/users/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Users"],
        }),
        // POS clock-in credentials — manager sets PIN + photo + is_pos_user
        setPosCredentials: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/user/users/${id}/pos-credentials`,
                method: "PUT",
                body,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "Users", id }, "Users"],
        }),
    }),
})

export const {
    useGetAllUsersQuery,
    useGetVenueStaffQuery,
    useGetUserByIdQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useSetPosCredentialsMutation,
} = userApi;