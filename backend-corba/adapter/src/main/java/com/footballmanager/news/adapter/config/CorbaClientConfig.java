package com.footballmanager.news.adapter.config;

import footballmanager.news.ServicioNoticias;
import org.omg.CORBA.ORB;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Properties;

/**
 * Configura el cliente CORBA del adapter. Devuelve SIEMPRE un proxy perezoso
 * ({@link LazyServicioNoticias}) que resuelve el servant en la primera llamada
 * y se auto-recupera si el servidor CORBA se reinicia (re-resuelve ante
 * OBJECT_NOT_EXIST / TRANSIENT / COMM_FAILURE). Antes se cacheaba una
 * referencia concreta al arrancar: cuando el servidor reiniciaba quedaba
 * obsoleta y todas las peticiones fallaban con OBJECT_NOT_EXIST de por vida.
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
        log.info("Cliente CORBA perezoso para '{}' via {} (resuelve en la 1a llamada y " +
                "se auto-recupera ante reinicios del servidor).", servantName, corbaloc);
        return new LazyServicioNoticias(orb, corbaloc, servantName);
    }
}
