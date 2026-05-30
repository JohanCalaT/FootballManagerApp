package com.footballmanager.news.adapter.response;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ApiEnvelopeTest {

    @Test
    void success_factory() {
        ApiEnvelope<String> e = ApiEnvelope.success("OK", "payload");
        assertThat(e.getStatus()).isEqualTo("success");
        assertThat(e.getMessage()).isEqualTo("OK");
        assertThat(e.getData()).isEqualTo("payload");
    }

    @Test
    void error_factory() {
        ApiEnvelope<Object> e = ApiEnvelope.error("bad");
        assertThat(e.getStatus()).isEqualTo("error");
        assertThat(e.getMessage()).isEqualTo("bad");
        assertThat(e.getData()).isNull();
    }
}
