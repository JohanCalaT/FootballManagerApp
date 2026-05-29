package com.footballmanager.news.adapter.controller;

import com.footballmanager.news.adapter.sse.NewsEventBroadcaster;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NewsStreamController.class)
class NewsStreamControllerTest {

    @Autowired MockMvc mvc;
    @MockBean NewsEventBroadcaster broadcaster;

    @Test
    void stream_registra_suscriptor_y_arranca_async() throws Exception {
        when(broadcaster.register()).thenReturn(new SseEmitter());

        mvc.perform(get("/news/stream"))
                .andExpect(status().isOk())
                .andExpect(request().asyncStarted());

        verify(broadcaster).register();
    }
}
