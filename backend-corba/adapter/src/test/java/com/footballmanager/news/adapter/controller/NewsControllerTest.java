package com.footballmanager.news.adapter.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballmanager.news.adapter.dto.NoticiaDto;
import footballmanager.news.Noticia;
import footballmanager.news.NoticiaNoEncontrada;
import footballmanager.news.ServicioNoticias;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NewsController.class)
class NewsControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockBean ServicioNoticias servicio;

    @Test
    void listar_vacio_devuelve_envelope_success() throws Exception {
        when(servicio.listarTodas()).thenReturn(new Noticia[0]);
        mvc.perform(get("/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void listar_con_items() throws Exception {
        when(servicio.listarTodas()).thenReturn(new Noticia[]{
                new Noticia("1", "t1", "c1", "a", "2026-01-01", ""),
                new Noticia("2", "t2", "c2", "a", "2026-01-02", "")
        });
        mvc.perform(get("/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value("1"));
    }

    @Test
    void obtener_devuelve_envelope() throws Exception {
        when(servicio.obtenerPorId("42"))
                .thenReturn(new Noticia("42", "t", "c", "a", "2026", ""));
        mvc.perform(get("/news/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.id").value("42"));
    }

    @Test
    void publicar_201_y_devuelve_data() throws Exception {
        when(servicio.publicar(any())).thenReturn("generated-id");
        when(servicio.obtenerPorId(eq("generated-id")))
                .thenReturn(new Noticia("generated-id", "t", "c", "a", "2026-01-01T00:00Z", ""));
        NoticiaDto dto = new NoticiaDto();
        dto.setTitulo("t");
        dto.setContenido("c");
        dto.setAutor("a");

        mvc.perform(post("/news")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Creado"))
                .andExpect(jsonPath("$.data.id").value("generated-id"));

        ArgumentCaptor<Noticia> cap = ArgumentCaptor.forClass(Noticia.class);
        verify(servicio).publicar(cap.capture());
        assertThat(cap.getValue().titulo).isEqualTo("t");
    }

    @Test
    void publicar_validacion_titulo_blanco_devuelve_400() throws Exception {
        NoticiaDto dto = new NoticiaDto();
        dto.setTitulo("");
        dto.setContenido("c");
        dto.setAutor("a");
        mvc.perform(post("/news")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("error"));
    }

    @Test
    void delete_no_content() throws Exception {
        mvc.perform(delete("/news/abc"))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_inexistente_404() throws Exception {
        org.mockito.Mockito.doThrow(new NoticiaNoEncontrada("no existe"))
                .when(servicio).eliminar("zzz");
        mvc.perform(delete("/news/zzz"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value("error"))
                .andExpect(jsonPath("$.message").value("no existe"));
    }
}
