package com.footballmanager.news.adapter.config;

import footballmanager.news.DatosInvalidos;
import footballmanager.news.EstadoServicio;
import footballmanager.news.LimiteInvalido;
import footballmanager.news.Noticia;
import footballmanager.news.NoticiaNoEncontrada;
import footballmanager.news.ServicioNoticias;
import footballmanager.news.ServicioNoticiasHelper;
import org.omg.CORBA.COMM_FAILURE;
import org.omg.CORBA.OBJECT_NOT_EXIST;
import org.omg.CORBA.ORB;
import org.omg.CORBA.TRANSIENT;
import org.omg.CosNaming.NamingContextExt;
import org.omg.CosNaming.NamingContextExtHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Cliente perezoso y auto-recuperable del servant CORBA.
 *
 * Resuelve el servant la primera vez que se usa y cachea la referencia. Si el
 * servidor CORBA se reinicia (redeploy, scale-to-zero, crash) la referencia
 * cacheada apunta a un objeto transient que ya no existe y el ORB lanza
 * {@link OBJECT_NOT_EXIST} / {@link TRANSIENT} / {@link COMM_FAILURE}. En ese
 * caso descartamos la referencia, RE-RESOLVEMOS contra el Naming Service y
 * reintentamos la llamada UNA vez, de modo que el adapter se auto-sana sin
 * reiniciarse (antes cacheaba para siempre y devolvia OBJECT_NOT_EXIST de por
 * vida tras el primer reinicio del servidor).
 *
 * Si la re-resolucion tambien falla, propaga {@link COMM_FAILURE}, que
 * GlobalExceptionHandler mapea a 503.
 */
final class LazyServicioNoticias extends org.omg.CORBA.portable.ObjectImpl
        implements ServicioNoticias {

    private static final Logger log = LoggerFactory.getLogger(LazyServicioNoticias.class);

    private final ORB orb;
    private final String corbaloc;
    private final String servantName;
    private final AtomicReference<ServicioNoticias> cached = new AtomicReference<>();

    LazyServicioNoticias(ORB orb, String corbaloc, String servantName) {
        this.orb = orb;
        this.corbaloc = corbaloc;
        this.servantName = servantName;
    }

    /** Referencia cacheada o, si no hay, una recien resuelta. */
    private ServicioNoticias delegate() {
        ServicioNoticias cur = cached.get();
        return cur != null ? cur : resolve();
    }

    /** Resuelve el servant contra el Naming Service y lo cachea. */
    private ServicioNoticias resolve() {
        try {
            org.omg.CORBA.Object ns = orb.string_to_object(corbaloc);
            NamingContextExt nc = NamingContextExtHelper.narrow(ns);
            ServicioNoticias svc = ServicioNoticiasHelper.narrow(nc.resolve_str(servantName));
            cached.set(svc);
            return svc;
        } catch (Exception ex) {
            cached.set(null);
            throw new COMM_FAILURE("servidor CORBA no disponible: " + ex.getMessage());
        }
    }

    /** Descarta la referencia muerta y resuelve una fresca (tras un reinicio del server). */
    private ServicioNoticias refresh() {
        log.warn("Referencia CORBA obsoleta (reinicio del servidor?); re-resolviendo '{}'.", servantName);
        cached.set(null);
        return resolve();
    }

    /** True si la excepcion indica que la referencia esta muerta y conviene re-resolver. */
    private static boolean isStale(RuntimeException e) {
        return e instanceof OBJECT_NOT_EXIST || e instanceof TRANSIENT || e instanceof COMM_FAILURE;
    }

    @Override
    public String publicar(Noticia n) throws DatosInvalidos {
        try {
            return delegate().publicar(n);
        } catch (RuntimeException e) {
            if (!isStale(e)) throw e;
            return refresh().publicar(n);
        }
    }

    @Override
    public Noticia[] listarTodas() {
        try {
            return delegate().listarTodas();
        } catch (RuntimeException e) {
            if (!isStale(e)) throw e;
            return refresh().listarTodas();
        }
    }

    @Override
    public Noticia obtenerPorId(String id) throws NoticiaNoEncontrada {
        try {
            return delegate().obtenerPorId(id);
        } catch (RuntimeException e) {
            if (!isStale(e)) throw e;
            return refresh().obtenerPorId(id);
        }
    }

    @Override
    public void eliminar(String id) throws NoticiaNoEncontrada {
        try {
            delegate().eliminar(id);
        } catch (RuntimeException e) {
            if (!isStale(e)) throw e;
            refresh().eliminar(id);
        }
    }

    @Override
    public void resetear() {
        try {
            delegate().resetear();
        } catch (RuntimeException e) {
            if (!isStale(e)) throw e;
            refresh().resetear();
        }
    }

    @Override
    public void setLimiteMaximo(int n) throws LimiteInvalido {
        try {
            delegate().setLimiteMaximo(n);
        } catch (RuntimeException e) {
            if (!isStale(e)) throw e;
            refresh().setLimiteMaximo(n);
        }
    }

    @Override
    public EstadoServicio obtenerEstado() {
        try {
            return delegate().obtenerEstado();
        } catch (RuntimeException e) {
            if (!isStale(e)) throw e;
            return refresh().obtenerEstado();
        }
    }

    @Override
    public String[] _ids() {
        return new String[]{"IDL:footballmanager/news/ServicioNoticias:1.0"};
    }
}
