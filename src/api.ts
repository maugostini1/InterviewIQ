export const API_BASE_URL = "http://10.0.2.2:8000";
import * as SecureStore from "expo-secure-store";

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

export type ResumeUploadResponse = {
  message: string;
  filename: string;
  stored_filename?: string;
};

export async function uploadResume(
  file: {
    uri: string;
    name: string;
    mimeType?: string | null;
  },
  accessToken: string
): Promise<ResumeUploadResponse> {
  const formData = new FormData();

  formData.append(
    "resume",
    {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    } as any
  );

  const response = await fetch(`${API_BASE_URL}/resume/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
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
    throw new Error(
      responseData.detail ||
        `Resume upload failed with status ${response.status}`
    );
  }

  return responseData;
}

export type InterviewQuestion = {
  question_id: number;
  question_order: number;
  question: string;
};

export type StartInterviewResult = {
  session_id: number;
  questions: InterviewQuestion[];
};

export type StarFeedback = {
  answer_id: number;
  total_score: number;
  scores: {
    situation: number;
    task: number;
    action: number;
    result: number;
  };
  strengths: string[];
  improvements: string[];
  feedback: string;
  suggested_answer: string;
};

async function getAccessToken(): Promise<string> {
  const token = await SecureStore.getItemAsync("access_token");

  if (!token) {
    throw new Error("You must be logged in.");
  }

  return token;
}

async function parseApiResponse(response: Response) {
  const responseText = await response.text();

  console.log("Response status:", response.status);
  console.log("Response body:", responseText);

  let data: any;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {
      detail: responseText || "The server returned an invalid response.",
    };
  }

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

export async function startMockInterview(
  targetJob: string
): Promise<StartInterviewResult> {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/interviews/start`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        target_job: targetJob,
      }),
    }
  );

  return parseApiResponse(response);
}

export async function submitMockInterviewAnswer(
  sessionId: number,
  questionId: number,
  answer: string
): Promise<StarFeedback> {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/interviews/answer`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
        question_id: questionId,
        answer,
      }),
    }
  );

  return await parseApiResponse(response);
}

export async function completeMockInterview(
  sessionId: number
) {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/interviews/${sessionId}/complete`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseApiResponse(response);
}