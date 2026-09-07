import { apiClient } from "./client";
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
} from "@/types/auth";

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>("/auth/login", credentials);
    return data;
  },
  changePassword: async (body: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const { data } = await apiClient.post<ChangePasswordResponse>("/auth/change-password", body);
    return data;
  },
};
