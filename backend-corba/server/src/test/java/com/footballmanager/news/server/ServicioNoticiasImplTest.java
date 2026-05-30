package com.footballmanager.news.server;

import footballmanager.news.DatosInvalidos;
import footballmanager.news.EstadoServicio;
import footballmanager.news.LimiteInvalido;
import footballmanager.news.Noticia;
import footballmanager.news.NoticiaNoEncontrada;
import org.junit.Before;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class ServicioNoticiasImplTest {

    private ServicioNoticiasImpl svc;
    private RepositorioNoticias repo;

    @Before
    public void setUp() {
        repo = new RepositorioNoticias(10);
        svc = new ServicioNoticiasImpl(repo);
    }

    private static Noticia validNoticia() {
        return new Noticia("", "titulo", "contenido", "admin", "", null);
    }

    @Test
    public void publicar_asigna_id_y_fecha() throws Exception {
        Noticia in = validNoticia();
        String id = svc.publicar(in);
        assertNotNull(id);
        assertTrue(id.length() > 0);
        Noticia stored = svc.obtenerPorId(id);
        assertNotNull(stored.fechaPub);
        assertTrue(stored.fechaPub.length() > 0);
        assertEquals("", stored.imagenUrl);
    }

    @Test(expected = DatosInvalidos.class)
    public void publicar_titulo_vacio() throws DatosInvalidos {
        Noticia n = new Noticia("", "", "c", "a", "", "");
        svc.publicar(n);
    }

    @Test(expected = DatosInvalidos.class)
    public void publicar_titulo_excede_max() throws DatosInvalidos {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 201; i++) sb.append('x');
        svc.publicar(new Noticia("", sb.toString(), "c", "a", "", ""));
    }

    @Test(expected = DatosInvalidos.class)
    public void publicar_contenido_vacio() throws DatosInvalidos {
        svc.publicar(new Noticia("", "t", "", "a", "", ""));
    }

    @Test(expected = DatosInvalidos.class)
    public void publicar_autor_vacio() throws DatosInvalidos {
        svc.publicar(new Noticia("", "t", "c", "", "", ""));
    }

    @Test(expected = DatosInvalidos.class)
    public void publicar_null() throws DatosInvalidos {
        svc.publicar(null);
    }

    @Test
    public void listarTodas_y_eliminar() throws Exception {
        String id = svc.publicar(validNoticia());
        assertEquals(1, svc.listarTodas().length);
        svc.eliminar(id);
        assertEquals(0, svc.listarTodas().length);
    }

    @Test(expected = NoticiaNoEncontrada.class)
    public void obtenerPorId_inexistente() throws NoticiaNoEncontrada {
        svc.obtenerPorId("xxx");
    }

    @Test(expected = NoticiaNoEncontrada.class)
    public void eliminar_inexistente() throws NoticiaNoEncontrada {
        svc.eliminar("xxx");
    }

    @Test
    public void resetear_y_estado() throws Exception {
        svc.publicar(validNoticia());
        svc.resetear();
        EstadoServicio e = svc.obtenerEstado();
        assertEquals(0, e.totalNoticias);
        assertEquals(10, e.limiteMaximo);
        assertNotNull(e.fechaUltimoReset);
    }

    @Test
    public void setLimiteMaximo_ok() throws LimiteInvalido {
        svc.setLimiteMaximo(5);
        assertEquals(5, svc.obtenerEstado().limiteMaximo);
    }

    @Test(expected = LimiteInvalido.class)
    public void setLimiteMaximo_invalido() throws LimiteInvalido {
        svc.setLimiteMaximo(0);
    }
}
