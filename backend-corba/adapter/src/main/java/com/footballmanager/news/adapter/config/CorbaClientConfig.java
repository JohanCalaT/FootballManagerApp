package com.footballmanager.news.adapter.config;

import footballmanager.news.ServicioNoticias;
import footballmanager.news.ServicioNoticiasHelper;
import org.omg.CORBA.ORB;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Properties;

/**
 * Resuelve la referencia al servant CORBA al arrancar, via corbaloc.
 * Si el servidor no esta disponible la app arranca igualmente; cada request
 * recibira COMM_FAILURE que el GlobalExceptionHandler mapea a 503.
 */
@Configuration
public class CorbaClientConfig {

    private static final Logger log = LoggerFactory.getLogger(CorbaClientConfig.class);

    @Value("${corba.naming.host:corba-server}")
    private String namingHost;

    @Value("${corba.naming.port:9000}")
    private String namingPort;

    @Value("${corba.servant.name:ServicioNoticias}")
    private String servantName;

    @Bean(destroyMethod = "destroy")
    public ORB orb() {
        Properties props = new Properties();
        props.put("org.omg.CORBA.ORBInitialHost", namingHost);
        props.put("org.omg.CORBA.ORBInitialPort", namingPort);
        return ORB.init(new String[0], props);
    }

    @Bean
    public ServicioNoticias servicioNoticias(ORB orb) {
        String corbaloc = "corbaloc::" + namingHost + ":" + namingPort + "/NameService";
        log.info("Resolviendo NameService via {}", corbaloc);
        try {
            org.omg.CORBA.Object ns = orb.string_to_object(corbaloc);
            org.omg.CosNaming.NamingContextExt nc =
                    org.omg.CosNaming.NamingContextExtHelper.narrow(ns);
            org.omg.CORBA.Object ref = nc.resolve_str(servantName);
            ServicioNoticias svc = ServicioNoticiasHelper.narrow(ref);
            log.info("Servant '{}' resuelto OK.", servantName);
            return svc;
        } catch (Exception ex) {
            log.warn("No se pudo resolver '{}' al arrancar ({}). " +
                    "Las peticiones devolveran 503 hasta que el servidor responda.",
                    servantName, ex.toString());
            // Proxy perezoso: reintenta la resolucion en cada llamada.
            return new LazyServicioNoticias(orb, corbaloc, servantName);
        }
    }
}
