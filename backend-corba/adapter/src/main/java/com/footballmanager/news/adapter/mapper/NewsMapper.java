package com.footballmanager.news.adapter.mapper;

import com.footballmanager.news.adapter.dto.EstadoDto;
import com.footballmanager.news.adapter.dto.NoticiaDto;
import footballmanager.news.EstadoServicio;
import footballmanager.news.Noticia;

public final class NewsMapper {

    private NewsMapper() { }

    public static Noticia toCorba(NoticiaDto dto) {
        return new Noticia(
                dto.getId() == null ? "" : dto.getId(),
                nullSafe(dto.getTitulo()),
                nullSafe(dto.getContenido()),
                nullSafe(dto.getAutor()),
                dto.getFechaPub() == null ? "" : dto.getFechaPub(),
                dto.getImagenUrl() == null ? "" : dto.getImagenUrl());
    }

    public static NoticiaDto toDto(Noticia n) {
        NoticiaDto dto = new NoticiaDto();
        dto.setId(n.id);
        dto.setTitulo(n.titulo);
        dto.setContenido(n.contenido);
        dto.setAutor(n.autor);
        dto.setFechaPub(n.fechaPub);
        dto.setImagenUrl(n.imagenUrl);
        return dto;
    }

    public static EstadoDto toDto(EstadoServicio e) {
        return new EstadoDto(e.totalNoticias, e.limiteMaximo, e.fechaUltimoReset);
    }

    private static String nullSafe(String s) { return s == null ? "" : s; }
}
