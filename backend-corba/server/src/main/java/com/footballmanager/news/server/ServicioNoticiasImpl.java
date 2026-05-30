package com.footballmanager.news.server;

import footballmanager.news.DatosInvalidos;
import footballmanager.news.EstadoServicio;
import footballmanager.news.LimiteInvalido;
import footballmanager.news.Noticia;
import footballmanager.news.NoticiaNoEncontrada;
import footballmanager.news.ServicioNoticiasPOA;

import java.time.Instant;
import java.util.UUID;

public class ServicioNoticiasImpl extends ServicioNoticiasPOA {

    private static final int MAX_TITULO = 200;
    private static final int MAX_CONTENIDO = 5000;
    private static final int MAX_AUTOR = 100;

    private final RepositorioNoticias repo;

    public ServicioNoticiasImpl(RepositorioNoticias repo) {
        this.repo = repo;
    }

    @Override
    public String publicar(Noticia noticia) throws DatosInvalidos {
        if (noticia == null) {
            throw new DatosInvalidos("noticia no puede ser null");
        }
        if (isBlank(noticia.titulo) || noticia.titulo.length() > MAX_TITULO) {
            throw new DatosInvalidos("titulo invalido (1-" + MAX_TITULO + ")");
        }
        if (isBlank(noticia.contenido) || noticia.contenido.length() > MAX_CONTENIDO) {
            throw new DatosInvalidos("contenido invalido (1-" + MAX_CONTENIDO + ")");
        }
        if (isBlank(noticia.autor) || noticia.autor.length() > MAX_AUTOR) {
            throw new DatosInvalidos("autor invalido (1-" + MAX_AUTOR + ")");
        }

        noticia.id = UUID.randomUUID().toString();
        noticia.fechaPub = Instant.now().toString();
        if (noticia.imagenUrl == null) {
            noticia.imagenUrl = "";
        }
        repo.agregar(noticia);
        return noticia.id;
    }

    @Override
    public Noticia[] listarTodas() {
        return repo.listar();
    }

    @Override
    public Noticia obtenerPorId(String id) throws NoticiaNoEncontrada {
        Noticia n = repo.obtener(id);
        if (n == null) {
            throw new NoticiaNoEncontrada("Noticia no encontrada: " + id);
        }
        return n;
    }

    @Override
    public void eliminar(String id) throws NoticiaNoEncontrada {
        if (!repo.eliminar(id)) {
            throw new NoticiaNoEncontrada("Noticia no encontrada: " + id);
        }
    }

    @Override
    public void resetear() {
        repo.resetear();
    }

    @Override
    public void setLimiteMaximo(int nuevoLimite) throws LimiteInvalido {
        try {
            repo.setLimite(nuevoLimite);
        } catch (IllegalArgumentException ex) {
            throw new LimiteInvalido(ex.getMessage());
        }
    }

    @Override
    public EstadoServicio obtenerEstado() {
        return new EstadoServicio(
                repo.size(),
                repo.getLimiteMaximo(),
                repo.getFechaUltimoReset().toString());
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
