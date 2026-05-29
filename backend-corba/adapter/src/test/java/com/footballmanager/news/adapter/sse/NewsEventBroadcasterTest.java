package com.footballmanager.news.adapter.sse;

import com.footballmanager.news.adapter.dto.NoticiaDto;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.assertj.core.api.Assertions.assertThat;

class NewsEventBroadcasterTest {

    private static NoticiaDto sampleDto() {
        NoticiaDto dto = new NoticiaDto();
        dto.setId("n1");
        dto.setTitulo("t");
        dto.setContenido("c");
        dto.setAutor("a");
        return dto;
    }

    @Test
    void register_anade_un_suscriptor() {
        NewsEventBroadcaster b = new NewsEventBroadcaster();
        assertThat(b.activeConnections()).isZero();

        b.register();

        assertThat(b.activeConnections()).isEqualTo(1);
    }

    @Test
    void emitCreated_a_emitter_sano_no_lo_elimina() {
        NewsEventBroadcaster b = new NewsEventBroadcaster();
        b.register();

        b.emitCreated(sampleDto());

        assertThat(b.activeConnections()).isEqualTo(1);
    }

    @Test
    void emitDeleted_y_emitReset_no_lanzan_y_conservan_suscriptores() {
        NewsEventBroadcaster b = new NewsEventBroadcaster();
        b.register();

        b.emitDeleted("n1");
        b.emitReset();

        assertThat(b.activeConnections()).isEqualTo(1);
    }

    @Test
    void emit_elimina_emitters_que_ya_completaron() {
        NewsEventBroadcaster b = new NewsEventBroadcaster();
        SseEmitter emitter = b.register();
        assertThat(b.activeConnections()).isEqualTo(1);

        // Cliente desconectado: el emitter ya completo -> el siguiente send falla
        // y el broadcaster debe descartarlo silenciosamente.
        emitter.complete();
        b.emitCreated(sampleDto());

        assertThat(b.activeConnections()).isZero();
    }
}
