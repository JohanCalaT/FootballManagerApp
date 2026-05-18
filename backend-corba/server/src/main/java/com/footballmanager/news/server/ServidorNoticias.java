package com.footballmanager.news.server;

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

import java.util.Properties;

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
