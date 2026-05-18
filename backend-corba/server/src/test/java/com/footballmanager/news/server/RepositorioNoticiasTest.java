package com.footballmanager.news.server;

import footballmanager.news.Noticia;
import org.junit.Before;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

public class RepositorioNoticiasTest {

    private RepositorioNoticias repo;

    @Before
    public void setUp() {
        repo = new RepositorioNoticias(3);
    }

    private static Noticia n(String id, String titulo) {
        return new Noticia(id, titulo, "contenido", "admin", "2026-01-01T00:00:00Z", "");
    }

    @Test(expected = IllegalArgumentException.class)
    public void constructor_rejects_zero_or_negative() {
        new RepositorioNoticias(0);
    }

    @Test
    public void agregar_y_obtener() {
        repo.agregar(n("a", "uno"));
        assertEquals("uno", repo.obtener("a").titulo);
        assertEquals(1, repo.size());
    }

    @Test(expected = IllegalArgumentException.class)
    public void agregar_rechaza_id_nulo() {
        repo.agregar(n(null, "x"));
    }

    @Test(expected = IllegalArgumentException.class)
    public void agregar_rechaza_id_vacio() {
        repo.agregar(n("", "x"));
    }

    @Test(expected = IllegalArgumentException.class)
    public void agregar_rechaza_null() {
        repo.agregar(null);
    }

    @Test
    public void fifo_descarta_mas_antiguo_al_llegar_al_limite() {
        repo.agregar(n("a", "1"));
        repo.agregar(n("b", "2"));
        repo.agregar(n("c", "3"));
        repo.agregar(n("d", "4")); // expulsa a "a"
        assertEquals(3, repo.size());
        assertNull(repo.obtener("a"));
        assertNotNull(repo.obtener("b"));
        assertNotNull(repo.obtener("c"));
        assertNotNull(repo.obtener("d"));
    }

    @Test
    public void listar_devuelve_orden_de_insercion() {
        repo.agregar(n("a", "1"));
        repo.agregar(n("b", "2"));
        Noticia[] arr = repo.listar();
        assertEquals(2, arr.length);
        assertEquals("a", arr[0].id);
        assertEquals("b", arr[1].id);
    }

    @Test
    public void eliminar_existente_devuelve_true() {
        repo.agregar(n("a", "1"));
        assertTrue(repo.eliminar("a"));
        assertEquals(0, repo.size());
    }

    @Test
    public void eliminar_inexistente_devuelve_false() {
        assertFalse(repo.eliminar("no-existe"));
    }

    @Test
    public void resetear_vacia_y_actualiza_fecha() throws InterruptedException {
        repo.agregar(n("a", "1"));
        java.time.Instant antes = repo.getFechaUltimoReset();
        Thread.sleep(5);
        repo.resetear();
        assertEquals(0, repo.size());
        assertTrue(repo.getFechaUltimoReset().isAfter(antes));
    }

    @Test
    public void setLimite_menor_al_size_recorta_los_mas_antiguos() {
        repo.agregar(n("a", "1"));
        repo.agregar(n("b", "2"));
        repo.agregar(n("c", "3"));
        repo.setLimite(1);
        assertEquals(1, repo.size());
        assertNull(repo.obtener("a"));
        assertNull(repo.obtener("b"));
        assertNotNull(repo.obtener("c"));
    }

    @Test
    public void setLimite_mayor_no_afecta() {
        repo.agregar(n("a", "1"));
        repo.setLimite(10);
        assertEquals(1, repo.size());
        assertEquals(10, repo.getLimiteMaximo());
    }

    @Test
    public void setLimite_rechaza_cero() {
        try {
            repo.setLimite(0);
            fail("debio lanzar");
        } catch (IllegalArgumentException expected) { /* ok */ }
    }

    @Test(expected = IllegalArgumentException.class)
    public void setLimite_rechaza_mayor_a_10000() {
        repo.setLimite(10_001);
    }
}
