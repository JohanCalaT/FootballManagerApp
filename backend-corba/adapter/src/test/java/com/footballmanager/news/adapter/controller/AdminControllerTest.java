package com.footballmanager.news.adapter.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.footballmanager.news.adapter.dto.LimiteDto;
import footballmanager.news.EstadoServicio;
import footballmanager.news.LimiteInvalido;
import footballmanager.news.ServicioNoticias;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
class AdminControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockBean ServicioNoticias servicio;

    @Test
    void status_devuelve_envelope_y_estado() throws Exception {
        when(servicio.obtenerEstado()).thenReturn(new EstadoServicio(7, 50, "2026-01-01T00:00:00Z"));
        mvc.perform(get("/admin/status").header("X-User-Admin", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.data.totalNoticias").value(7))
                .andExpect(jsonPath("$.data.limiteMaximo").value(50));
    }

    @Test
    void reset_no_content_y_llama_servicio() throws Exception {
        mvc.perform(post("/admin/reset"))
                .andExpect(status().isNoContent());
        verify(servicio).resetear();
    }

    @Test
    void setMaxSize_ok() throws Exception {
        when(servicio.obtenerEstado()).thenReturn(new EstadoServicio(0, 5, "2026-01-01T00:00:00Z"));
        mvc.perform(put("/admin/config/max-size")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new LimiteDto(5))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.limiteMaximo").value(5));
    }

    @Test
    void setMaxSize_validacion_min_400() throws Exception {
        mvc.perform(put("/admin/config/max-size")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new LimiteDto(0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("error"));
    }

    @Test
    void setMaxSize_corba_invalido_400() throws Exception {
        doThrow(new LimiteInvalido("fuera de rango")).when(servicio).setLimiteMaximo(7);
        mvc.perform(put("/admin/config/max-size")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new LimiteDto(7))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("fuera de rango"));
    }
}
