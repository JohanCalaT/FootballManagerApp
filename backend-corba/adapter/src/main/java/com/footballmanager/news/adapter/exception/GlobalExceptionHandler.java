package com.footballmanager.news.adapter.exception;

import com.footballmanager.news.adapter.response.ApiEnvelope;
import footballmanager.news.DatosInvalidos;
import footballmanager.news.LimiteInvalido;
import footballmanager.news.NoticiaNoEncontrada;
import org.omg.CORBA.COMM_FAILURE;
import org.omg.CORBA.TRANSIENT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NoticiaNoEncontrada.class)
    public ResponseEntity<ApiEnvelope<Object>> handleNotFound(NoticiaNoEncontrada ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiEnvelope.error(ex.mensaje));
    }

    @ExceptionHandler(DatosInvalidos.class)
    public ResponseEntity<ApiEnvelope<Object>> handleInvalid(DatosInvalidos ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiEnvelope.error(ex.mensaje));
    }

    @ExceptionHandler(LimiteInvalido.class)
    public ResponseEntity<ApiEnvelope<Object>> handleLimite(LimiteInvalido ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiEnvelope.error(ex.mensaje));
    }

    @ExceptionHandler({COMM_FAILURE.class, TRANSIENT.class})
    public ResponseEntity<ApiEnvelope<Object>> handleCorbaDown(org.omg.CORBA.SystemException ex) {
        log.warn("Servidor CORBA inalcanzable: {}", ex.toString());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiEnvelope.error("Servidor CORBA no disponible"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiEnvelope<Object>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .orElse("Datos invalidos");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiEnvelope.error(msg));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiEnvelope<Object>> handleIllegalArg(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiEnvelope.error(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiEnvelope<Object>> handleUnknown(Exception ex) {
        log.error("Error inesperado", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiEnvelope.error("Error interno: " + ex.getClass().getSimpleName()));
    }
}
