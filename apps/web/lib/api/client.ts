// Typed axios client for API calls

import type { AxiosInstance } from "axios";

import axios from "axios";

// Error response type
interface ApiErrorResponse {
  error: string;
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to extract error message from axios error
function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const axiosError = error as {
      response?: { data?: ApiErrorResponse };
      message?: string;
    };

    return (
      axiosError.response?.data?.error ??
      axiosError.message ??
      "An unexpected error occurred"
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

export { apiClient, getApiErrorMessage };
