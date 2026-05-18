package com.footballmanager.news.server;

import footballmanager.news.Noticia;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Almacen en memoria de noticias con limite configurable y politica FIFO.
 * Todas las operaciones son O(1) salvo {@link #listar()} y {@link #setLimite(int)}.
 */
public final class RepositorioNoticias {

    private final Map<String, Noticia> mapa =
            Collections.synchronizedMap(new LinkedHashMap<>());
    private final Object lock = new Object();
    private volatile int limiteMaximo;
    private volatile Instant fechaUltimoReset;

    public RepositorioNoticias(int limiteInicial) {
        if (limiteInicial <= 0) {
            throw new IllegalArgumentException("limiteInicial debe ser > 0");
        }
        this.limiteMaximo = limiteInicial;
        this.fechaUltimoReset = Instant.now();
    }

    public void agregar(Noticia noticia) {
        if (noticia == null || noticia.id == null || noticia.id.isEmpty()) {
            throw new IllegalArgumentException("noticia.id obligatorio");
        }
        synchronized (lock) {
            if (mapa.size() >= limiteMaximo) {
                String oldest = mapa.keySet().iterator().next();
                mapa.remove(oldest);
            }
            mapa.put(noticia.id, noticia);
        }
    }

    public Noticia obtener(String id) {
        return mapa.get(id);
    }

    public Noticia[] listar() {
        synchronized (lock) {
            return mapa.values().toArray(new Noticia[0]);
        }
    }

    public boolean eliminar(String id) {
        synchronized (lock) {
            return mapa.remove(id) != null;
        }
    }

    public void resetear() {
        synchronized (lock) {
            mapa.clear();
            fechaUltimoReset = Instant.now();
        }
    }

    public void setLimite(int nuevoLimite) {
        if (nuevoLimite <= 0 || nuevoLimite > 10_000) {
            throw new IllegalArgumentException(
                    "limite fuera de rango (1-10000): " + nuevoLimite);
        }
        synchronized (lock) {
            this.limiteMaximo = nuevoLimite;
            while (mapa.size() > nuevoLimite) {
                String oldest = mapa.keySet().iterator().next();
                mapa.remove(oldest);
            }
        }
    }

    public int size() {
        return mapa.size();
    }

    public int getLimiteMaximo() {
        return limiteMaximo;
    }

    public Instant getFechaUltimoReset() {
        return fechaUltimoReset;
    }
}
