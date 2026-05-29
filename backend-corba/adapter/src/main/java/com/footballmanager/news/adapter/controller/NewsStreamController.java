package com.footballmanager.news.adapter.controller;

import com.footballmanager.news.adapter.sse.NewsEventBroadcaster;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Stream SSE de noticias en tiempo real.
 *
 * Endpoint publico (solo lectura): cualquier usuario registrado se suscribe via
 * el navegador con {@code EventSource('/api/news/stream')}. El Gateway YARP lo
 * reenvia con streaming (catch-all {@code /api/news/**}). Los eventos emitidos
 * son {@code created} / {@code deleted} / {@code reset}.
 */
@RestController
public class NewsStreamController {

    private final NewsEventBroadcaster broadcaster;

    public NewsStreamController(NewsEventBroadcaster broadcaster) {
        this.broadcaster = broadcaster;
    }

    @GetMapping(value = "/news/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return broadcaster.register();
    }
}
