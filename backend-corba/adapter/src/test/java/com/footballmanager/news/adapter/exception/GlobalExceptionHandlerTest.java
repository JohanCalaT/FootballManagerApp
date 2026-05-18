package com.footballmanager.news.adapter.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballmanager.news.adapter.controller.NewsController;
import com.footballmanager.news.adapter.dto.NoticiaDto;
import footballmanager.news.DatosInvalidos;
import footballmanager.news.NoticiaNoEncontrada;
import footballmanager.news.ServicioNoticias;
import org.junit.jupiter.api.Test;
import org.omg.CORBA.COMM_FAILURE;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NewsController.class)
class GlobalExceptionHandlerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockBean ServicioNoticias servicio;

    @Test
    void noticia_no_encontrada_404() throws Exception {
        when(servicio.obtenerPorId("x")).thenThrow(new NoticiaNoEncontrada("no existe"));
        mvc.perform(get("/news/x"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value("error"))
                .andExpect(jsonPath("$.message").value("no existe"));
    }

    @Test
    void datos_invalidos_400() throws Exception {
        // publicar() declara throws DatosInvalidos; las otras operaciones no permiten
        // mockear con thenThrow esta checked exception. LimiteInvalido se cubre en
        // AdminControllerTest.setMaxSize_corba_invalido_400.
        when(servicio.publicar(any())).thenThrow(new DatosInvalidos("invalido"));
        NoticiaDto dto = new NoticiaDto();
        dto.setTitulo("t");
        dto.setContenido("c");
        dto.setAutor("a");
        mvc.perform(post("/news")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("error"))
                .andExpect(jsonPath("$.message").value("invalido"));
    }

    @Test
    void corba_comm_failure_503() throws Exception {
        when(servicio.listarTodas()).thenThrow(new COMM_FAILURE("server down"));
        mvc.perform(get("/news"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("error"))
                .andExpect(jsonPath("$.message").value("Servidor CORBA no disponible"));
    }

    @Test
    void illegal_argument_400() throws Exception {
        when(servicio.listarTodas()).thenThrow(new IllegalArgumentException("malo"));
        mvc.perform(get("/news"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("malo"));
    }

    @Test
    void exception_generica_500() throws Exception {
        when(servicio.listarTodas()).thenThrow(new RuntimeException("boom"));
        mvc.perform(get("/news"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value("error"));
    }
}
