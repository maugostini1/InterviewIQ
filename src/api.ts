export const API_BASE_URL = "http://10.0.2.2:8000";

export async function signupAccount(account: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  career_field?: string;
  target_job?: string;
}) {
  const url = `${API_BASE_URL}/auth/signup`;

  console.log("Sending signup request to:", url);
  console.log("Signup data:", {
    ...account,
    password: "[hidden]",
  });

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(account),
    });
  } catch (error) {
    console.error("Network request failed:", error);

    throw new Error(
      `Could not reach the Python server at ${url}. Make sure Uvicorn is running.`
    );
  }

  const responseText = await response.text();

  console.log("Signup response status:", response.status);
  console.log("Signup response body:", responseText);

  let responseData;

  try {
    responseData = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseData = { detail: responseText };
  }

  if (!response.ok) {
    const detail =
      responseData.detail ||
      responseData.message ||
      `Server returned status ${response.status}`;

    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
  }

  return responseData;
}

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  user: {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
};

export async function loginAccount(
  credentials: LoginRequest
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }),
  });

  const responseText = await response.text();

  let responseData: any;

  try {
    responseData = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseData = {
      detail: responseText,
    };
  }

  if (!response.ok) {
    const detail =
      responseData.detail ||
      responseData.message ||
      `Login failed with status ${response.status}`;

    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
  }

  return responseData;
}

import * as SecureStore from "expo-secure-store";

export async function getCurrentUser() {
  const token = await SecureStore.getItemAsync("access_token");

  if (!token) {
    throw new Error("Not authenticated.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load user.");
  }

  return data;
}