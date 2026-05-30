package com.footballmanager.news.adapter.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Hook para autorizacion del admin. En fase 1 es PERMISIVO: solo loguea.
 * En fase 2 basta con poner admin.enforce-auth=true en application.yml para
 * que rechace con 403 cualquier request a /admin/** sin X-User-Admin=true.
 */
@Component
public class AdminAuthInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthInterceptor.class);
    private static final String HEADER = "X-User-Admin";

    @Value("${admin.enforce-auth:false}")
    private boolean enforceAuth;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        String header = request.getHeader(HEADER);
        boolean isAdmin = "true".equalsIgnoreCase(header);

        if (!enforceAuth) {
            log.info("[admin-permisivo] {} {} | X-User-Admin={}",
                    request.getMethod(), request.getRequestURI(), header);
            return true;
        }

        if (isAdmin) {
            return true;
        }

        log.warn("[admin-bloqueado] {} {} sin X-User-Admin=true",
                request.getMethod(), request.getRequestURI());
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"status\":\"error\",\"message\":\"X-User-Admin requerido\",\"data\":null}");
        return false;
    }
}
