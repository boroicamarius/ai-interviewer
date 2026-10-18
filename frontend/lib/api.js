const API_ROOT = "/backend/api/v1";

export class ApiError extends Error {
  constructor(message, { status = 0, code = "request_failed", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, signal, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the AI Interviewer API. Is the backend running?", {
      code: "network_error",
    });
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const detail = payload?.error;
    throw new ApiError(detail?.message || `The request failed (${response.status}).`, {
      status: response.status,
      code: detail?.code || "request_failed",
      details: detail?.details || null,
    });
  }

  return payload;
}

export const api = {
  getMeta: (options) => request("/meta", options),

  startInterview: ({ topic, context, questionCount, persona }, options = {}) =>
    request("/interviews", {
      method: "POST",
      body: {
        topic,
        context: context || null,
        question_count: questionCount ?? null,
        persona: persona || null,
      },
      ...options,
    }),

  getInterview: (id, options) => request(`/interviews/${id}`, options),

  submitAnswer: (id, { questionId, answer }, options = {}) =>
    request(`/interviews/${id}/answers`, {
      method: "POST",
      body: { question_id: questionId, answer },
      ...options,
    }),

  completeInterview: (id, options) =>
    request(`/interviews/${id}/complete`, { method: "POST", ...options }),

  listInterviews: ({ limit = 50, offset = 0 } = {}, options = {}) =>
    request(`/interviews?limit=${limit}&offset=${offset}`, options),

  deleteInterview: (id, options) =>
    request(`/interviews/${id}`, { method: "DELETE", ...options }),

  exportUrl: (id) => `${API_ROOT}/interviews/${id}/export`,
};

export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
