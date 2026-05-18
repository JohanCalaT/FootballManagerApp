package com.footballmanager.news.adapter.config;

import footballmanager.news.DatosInvalidos;
import footballmanager.news.EstadoServicio;
import footballmanager.news.LimiteInvalido;
import footballmanager.news.Noticia;
import footballmanager.news.NoticiaNoEncontrada;
import footballmanager.news.ServicioNoticias;
import footballmanager.news.ServicioNoticiasHelper;
import org.omg.CORBA.COMM_FAILURE;
import org.omg.CORBA.ORB;
import org.omg.CosNaming.NamingContextExt;
import org.omg.CosNaming.NamingContextExtHelper;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Reintenta la resolucion del servant en cada llamada hasta lograrlo.
 * Si sigue cayendo eleva COMM_FAILURE, que GlobalExceptionHandler mapea a 503.
 */
final class LazyServicioNoticias extends org.omg.CORBA.portable.ObjectImpl
        implements ServicioNoticias {

    private final ORB orb;
    private final String corbaloc;
    private final String servantName;
    private final AtomicReference<ServicioNoticias> cached = new AtomicReference<>();

    LazyServicioNoticias(ORB orb, String corbaloc, String servantName) {
        this.orb = orb;
        this.corbaloc = corbaloc;
        this.servantName = servantName;
    }

    private ServicioNoticias delegate() {
        ServicioNoticias cur = cached.get();
        if (cur != null) {
            return cur;
        }
        try {
            org.omg.CORBA.Object ns = orb.string_to_object(corbaloc);
            NamingContextExt nc = NamingContextExtHelper.narrow(ns);
            ServicioNoticias svc = ServicioNoticiasHelper.narrow(nc.resolve_str(servantName));
            cached.compareAndSet(null, svc);
            return svc;
        } catch (Exception ex) {
            throw new COMM_FAILURE("servidor CORBA no disponible: " + ex.getMessage());
        }
    }

    @Override public String publicar(Noticia n) throws DatosInvalidos { return delegate().publicar(n); }
    @Override public Noticia[] listarTodas() { return delegate().listarTodas(); }
    @Override public Noticia obtenerPorId(String id) throws NoticiaNoEncontrada { return delegate().obtenerPorId(id); }
    @Override public void eliminar(String id) throws NoticiaNoEncontrada { delegate().eliminar(id); }
    @Override public void resetear() { delegate().resetear(); }
    @Override public void setLimiteMaximo(int n) throws LimiteInvalido { delegate().setLimiteMaximo(n); }
    @Override public EstadoServicio obtenerEstado() { return delegate().obtenerEstado(); }

    @Override
    public String[] _ids() {
        return new String[]{"IDL:footballmanager/news/ServicioNoticias:1.0"};
    }
}
