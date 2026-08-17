export const API_BASE_URL = "http://10.0.2.2:8000";
import * as SecureStore from "expo-secure-store";

// Each type function is built to mimic the database collection of information.
// The types collect information that is supplied from the frontend and communicated to the backend
// where the functionality is produced.
export type InterviewAnswerResult = {
  question_id: number;
  question_order: number;
  question_text: string;
  answer_id: number;
  response: string;

  situation_score: number;
  task_score: number;
  action_score: number;
  results_score: number;
  total_score: number;

  feedback_text: string;
  strengths: string[];
  improvements: string[];
  suggested_answer: string;
};

export type CompletedInterview = {
  interview: {
    session_id: number;
    target_job?: string;
    status: string;
    score: number;

    overall_feedback?: string;
    overall_strengths: string[];
    overall_improvements: string[];
  };

  questions: InterviewAnswerResult[];
};

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

export type InterviewHistoryItem = {
  session_id: number;
  target_job: string | null;
  session_start_time: string;
  session_end_time: string | null;
  score: number | null;
  status: string;
};

export type InterviewHistory = {
  total_interviews: number;
  average_score: number;
  interviews: InterviewHistoryItem[];
};

//Handles signup functionality to store information in the backend for retrieval.
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

  // Try and catch blocks were assisted by AI to produce more identifiable issues.
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

// Handles login requests to backend. POST functions are pulled from backend via Uvicorn
// in order to login and welcome the user.
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

// Function obtains currentUser that is signed in using the SecureStore library.
// if statements ensure that user is authenicated against the database or if the network cannot load the user.
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

// Tokens are used to supply requests to SecureStore. 
// It helps with any further requests needed by FastAPI access points.
async function getAccessToken(): Promise<string> {
  const token = await SecureStore.getItemAsync("access_token");

  if (!token) {
    throw new Error("You must be logged in.");
  }

  return token;
}

// AI Assistance: JSON parse issues within program created issues. 
// AI provided parse function to help ensure that program avoids further JSON parse issues.
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

// Allows functionality to update Target job in React Frontend environment.
export async function updateTargetJob(
  targetJob: string
): Promise<{
  message: string;
  target_job: string;
}> {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/profile/target-job`,
    {
      method: "PATCH",
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

// Utilizes access token to start mock interview based on current user.
// Bridges the functionality between backend and frontend.
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

// Same functionality as start mock interview.
// functionality helps with submitting the interview based on user access token.
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

// Request for completing the mock interview.
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

// Obtains current interview session.
export async function getInterviewSession(
  sessionId: number
): Promise<CompletedInterview> {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/interviews/${sessionId}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseApiResponse(response);
}

// Submits for a cancellation for mock interview.
export async function cancelMockInterview(
  sessionId: number
) {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/interviews/${sessionId}/cancel`,
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

// Used to supply history functionlity between frontend and backend.
// All functionality is held on the home page.
export async function getInterviewHistory():
  Promise<InterviewHistory> {

  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/interviews/history`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const responseText = await response.text();

  console.log(
    "History response status:",
    response.status
  );

  console.log(
    "History response body:",
    responseText
  );

  if (!response.ok) {
    let message = responseText;

    try {
      const errorData = JSON.parse(responseText);
      message =
        errorData.detail ?? responseText;
    } catch {
      // plain text response
    }

    throw new Error(message);
  }

  return JSON.parse(responseText);
}