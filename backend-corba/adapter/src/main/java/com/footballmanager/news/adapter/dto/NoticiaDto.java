package com.footballmanager.news.adapter.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class NoticiaDto {

    private String id;

    @NotBlank
    @Size(max = 200)
    private String titulo;

    @NotBlank
    @Size(max = 5000)
    private String contenido;

    @NotBlank
    @Size(max = 100)
    private String autor;

    private String fechaPub;

    @Size(max = 500)
    private String imagenUrl;

    public NoticiaDto() { }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public String getAutor() { return autor; }
    public void setAutor(String autor) { this.autor = autor; }
    public String getFechaPub() { return fechaPub; }
    public void setFechaPub(String fechaPub) { this.fechaPub = fechaPub; }
    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }
}
