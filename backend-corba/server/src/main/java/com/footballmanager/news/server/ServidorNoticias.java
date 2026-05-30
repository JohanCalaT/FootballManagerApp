package com.footballmanager.news.server;

import footballmanager.news.Noticia;
import footballmanager.news.ServicioNoticias;
import footballmanager.news.ServicioNoticiasHelper;
import org.omg.CORBA.ORB;
import org.omg.CosNaming.NameComponent;
import org.omg.CosNaming.NamingContextExt;
import org.omg.CosNaming.NamingContextExtHelper;
import org.omg.PortableServer.POA;
import org.omg.PortableServer.POAHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Properties;
import java.util.UUID;

/**
 * Arranca el ORB, instancia el servant y lo registra en el Naming Service.
 * Configuracion via variables de entorno:
 *   NEWS_MAX_SIZE      (default 50)
 *   CORBA_PORT         (default 1050) — puerto IIOP del servidor
 *   NAMING_PORT        (default 9000) — puerto del Naming Service (orbd)
 *   NAMING_HOST        (default localhost) — host del Naming Service
 *   CORBA_SERVER_HOST  (default corba-server) — host publicado en el IOR
 */
public final class ServidorNoticias {

    private static final Logger log = LoggerFactory.getLogger(ServidorNoticias.class);
    private static final String SERVANT_NAME = "ServicioNoticias";

    private ServidorNoticias() { }

    public static void main(String[] args) throws Exception {
        int maxSize = parseIntEnv("NEWS_MAX_SIZE", 50);
        String namingHost = envOrDefault("NAMING_HOST", "localhost");
        String namingPort = envOrDefault("NAMING_PORT", "9000");
        String corbaServerHost = envOrDefault("CORBA_SERVER_HOST", "corba-server");
        String corbaServerPort = envOrDefault("CORBA_PORT", "1050");

        // Hostname/puerto que se publican dentro del IOR para clientes externos.
        System.setProperty("com.sun.CORBA.ORBServerHost", corbaServerHost);
        System.setProperty("com.sun.CORBA.ORBServerPort", corbaServerPort);

        Properties props = new Properties();
        props.put("org.omg.CORBA.ORBInitialHost", namingHost);
        props.put("org.omg.CORBA.ORBInitialPort", namingPort);

        log.info("Iniciando ORB (naming={}:{}, IOR publicado como {}:{}, NEWS_MAX_SIZE={})",
                namingHost, namingPort, corbaServerHost, corbaServerPort, maxSize);

        ORB orb = ORB.init(args, props);

        POA rootPoa = POAHelper.narrow(orb.resolve_initial_references("RootPOA"));
        rootPoa.the_POAManager().activate();

        RepositorioNoticias repo = new RepositorioNoticias(maxSize);
        seedDefaults(repo);
        ServicioNoticiasImpl servant = new ServicioNoticiasImpl(repo);

        org.omg.CORBA.Object ref = rootPoa.servant_to_reference(servant);
        ServicioNoticias href = ServicioNoticiasHelper.narrow(ref);

        NamingContextExt nc = NamingContextExtHelper.narrow(
                orb.resolve_initial_references("NameService"));
        NameComponent[] path = nc.to_name(SERVANT_NAME);
        nc.rebind(path, href);

        log.info("Servant '{}' registrado en el Naming Service. ORB listo.", SERVANT_NAME);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info("Apagando ORB...");
            try {
                orb.shutdown(true);
            } catch (Exception e) {
                log.warn("Error apagando ORB: {}", e.getMessage());
            }
        }));

        orb.run();
    }

    /**
     * Siembra unas noticias de ejemplo al arrancar para que el feed nunca
     * aparezca vacio en una demo recien levantada. Son datos en memoria: un
     * reset del admin las elimina y solo vuelven al reiniciar el servidor.
     * Incluyen acentos y signos tipograficos a proposito, para validar que el
     * transporte wstring (UTF-16) los preserva sin DATA_CONVERSION.
     */
    private static void seedDefaults(RepositorioNoticias repo) {
        String ahora = Instant.now().toString();
        repo.agregar(new Noticia(
                UUID.randomUUID().toString(),
                "El Almeria firma una remontada de epica",
                "El conjunto rojiblanco le dio la vuelta al marcador en los ultimos "
                        + "minutos — con dos goles en el descuento — para sumar tres "
                        + "puntos vitales en la pelea por el ascenso.",
                "Redaccion FMA",
                ahora,
                "https://images.unsplash.com/photo-1522778119026-d647f0596c20"));
        repo.agregar(new Noticia(
                UUID.randomUUID().toString(),
                "Mercado de fichajes: rumores y movimientos",
                "Varios clubes de Primera Division siguen de cerca a las jovenes "
                        + "promesas de la cantera. La direccion deportiva trabaja en "
                        + "silencio de cara a la proxima temporada.",
                "Redaccion FMA",
                ahora,
                "https://images.unsplash.com/photo-1551958219-acbc608c6377"));
        repo.agregar(new Noticia(
                UUID.randomUUID().toString(),
                "Analisis tactico de la jornada",
                "La presion alta y las transiciones rapidas marcaron el fin de semana. "
                        + "Repasamos las claves que decidieron los partidos mas igualados.",
                "Redaccion FMA",
                ahora,
                "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d"));
        log.info("Sembradas {} noticias por defecto.", repo.size());
    }

    private static int parseIntEnv(String name, int defaultValue) {
        String v = System.getenv(name);
        if (v == null || v.isEmpty()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(v);
        } catch (NumberFormatException e) {
            log.warn("Valor invalido para {}: '{}', usando default {}", name, v, defaultValue);
            return defaultValue;
        }
    }

    private static String envOrDefault(String name, String defaultValue) {
        String v = System.getenv(name);
        return (v == null || v.isEmpty()) ? defaultValue : v;
    }
}
