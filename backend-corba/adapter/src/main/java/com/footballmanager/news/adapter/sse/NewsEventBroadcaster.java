package com.footballmanager.news.adapter.sse;

import com.footballmanager.news.adapter.dto.NoticiaDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Difusor de eventos SSE para el subsistema de noticias.
 *
 * El servidor CORBA no empuja cambios; el push "en tiempo real" se origina en
 * este adapter: cuando una peticion HTTP publica/elimina/resetea, el controller
 * correspondiente llama aqui y reenviamos el evento a todos los navegadores
 * suscritos a {@code GET /news/stream}.
 *
 * Mantiene los emitters en una lista concurrente y descarta los que fallan al
 * enviar (cliente desconectado). No persiste nada: los clientes siembran su
 * estado inicial con {@code GET /news} y a partir de ahi escuchan el stream.
 */
@Component
public class NewsEventBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(NewsEventBroadcaster.class);

    /** 30 minutos: el cliente reconecta solo al expirar (EventSource lo hace). */
    private static final long STREAM_TIMEOUT_MS = 30L * 60L * 1000L;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /** Registra un nuevo suscriptor y devuelve su emitter para el controller. */
    public SseEmitter register() {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitter);
        });
        emitter.onError(e -> emitters.remove(emitter));
        emitters.add(emitter);
        try {
            // Comentario inicial: abre el stream de inmediato a traves de proxies.
            emitter.send(SseEmitter.event().comment("connected"));
        } catch (IOException | RuntimeException ex) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    public void emitCreated(NoticiaDto noticia) {
        broadcast("created", noticia);
    }

    public void emitDeleted(String id) {
        broadcast("deleted", Collections.singletonMap("id", id));
    }

    public void emitReset() {
        broadcast("reset", Collections.singletonMap("reset", Boolean.TRUE));
    }

    /** Suscriptores activos — util para tests y diagnostico. */
    public int activeConnections() {
        return emitters.size();
    }

    private void broadcast(String event, Object data) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(event)
                        .data(data, MediaType.APPLICATION_JSON));
            } catch (IOException | RuntimeException ex) {
                log.debug("Removiendo emitter SSE tras fallo: {}", ex.toString());
                emitters.remove(emitter);
            }
        }
    }
}
