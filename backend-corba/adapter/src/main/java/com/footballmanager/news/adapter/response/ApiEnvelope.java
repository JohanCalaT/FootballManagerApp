package com.footballmanager.news.adapter.response;

/**
 * Wrapper uniforme del proyecto: { status, message, data }.
 * status = "success" | "error".
 */
public final class ApiEnvelope<T> {

    public static final String SUCCESS = "success";
    public static final String ERROR = "error";

    private final String status;
    private final String message;
    private final T data;

    private ApiEnvelope(String status, String message, T data) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiEnvelope<T> success(String message, T data) {
        return new ApiEnvelope<>(SUCCESS, message, data);
    }

    public static <T> ApiEnvelope<T> error(String message) {
        return new ApiEnvelope<>(ERROR, message, null);
    }

    public String getStatus() { return status; }
    public String getMessage() { return message; }
    public T getData() { return data; }
}
