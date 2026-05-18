package com.footballmanager.news.adapter.response;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Envuelve toda respuesta de los controllers en ApiEnvelope.
 * Se salta springdoc/swagger y las que ya vienen envueltas.
 */
@ControllerAdvice(basePackages = "com.footballmanager.news.adapter.controller")
public class GlobalResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType,
                            Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body,
                                  MethodParameter returnType,
                                  MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request,
                                  ServerHttpResponse response) {
        if (body instanceof ApiEnvelope) {
            return body;
        }
        if (body == null) {
            // 204 No Content y similares: no envolver.
            return null;
        }
        String message = okMessageForStatus(response);
        return ApiEnvelope.success(message, body);
    }

    private String okMessageForStatus(ServerHttpResponse response) {
        try {
            int code = ((org.springframework.http.server.ServletServerHttpResponse) response)
                    .getServletResponse().getStatus();
            if (code == 201) return "Creado";
            if (code == 200) return "OK";
        } catch (ClassCastException ignored) { /* fall through */ }
        return "OK";
    }
}
