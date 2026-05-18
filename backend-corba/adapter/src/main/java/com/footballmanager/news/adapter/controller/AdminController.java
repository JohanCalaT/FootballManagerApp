package com.footballmanager.news.adapter.controller;

import com.footballmanager.news.adapter.dto.EstadoDto;
import com.footballmanager.news.adapter.dto.LimiteDto;
import com.footballmanager.news.adapter.mapper.NewsMapper;
import footballmanager.news.LimiteInvalido;
import footballmanager.news.ServicioNoticias;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final ServicioNoticias servicio;

    public AdminController(ServicioNoticias servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/status")
    public EstadoDto status() {
        return NewsMapper.toDto(servicio.obtenerEstado());
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> reset() {
        servicio.resetear();
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/config/max-size")
    public EstadoDto setMaxSize(@Valid @RequestBody LimiteDto body) throws LimiteInvalido {
        servicio.setLimiteMaximo(body.getLimite());
        return NewsMapper.toDto(servicio.obtenerEstado());
    }
}
