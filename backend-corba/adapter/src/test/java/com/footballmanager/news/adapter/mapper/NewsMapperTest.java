package com.footballmanager.news.adapter.mapper;

import com.footballmanager.news.adapter.dto.EstadoDto;
import com.footballmanager.news.adapter.dto.NoticiaDto;
import footballmanager.news.EstadoServicio;
import footballmanager.news.Noticia;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NewsMapperTest {

    @Test
    void dto_a_corba_y_vuelta() {
        NoticiaDto dto = new NoticiaDto();
        dto.setTitulo("t");
        dto.setContenido("c");
        dto.setAutor("a");
        dto.setImagenUrl("http://x");
        Noticia n = NewsMapper.toCorba(dto);
        assertThat(n.titulo).isEqualTo("t");
        assertThat(n.contenido).isEqualTo("c");
        assertThat(n.autor).isEqualTo("a");
        assertThat(n.imagenUrl).isEqualTo("http://x");
        assertThat(n.id).isEmpty();

        NoticiaDto back = NewsMapper.toDto(n);
        assertThat(back.getTitulo()).isEqualTo("t");
    }

    @Test
    void dto_a_corba_null_safe() {
        NoticiaDto dto = new NoticiaDto();
        Noticia n = NewsMapper.toCorba(dto);
        assertThat(n.id).isEmpty();
        assertThat(n.titulo).isEmpty();
        assertThat(n.fechaPub).isEmpty();
        assertThat(n.imagenUrl).isEmpty();
    }

    @Test
    void estado_a_dto() {
        EstadoDto d = NewsMapper.toDto(new EstadoServicio(3, 50, "2026-01-01"));
        assertThat(d.getTotalNoticias()).isEqualTo(3);
        assertThat(d.getLimiteMaximo()).isEqualTo(50);
        assertThat(d.getFechaUltimoReset()).isEqualTo("2026-01-01");
    }
}
