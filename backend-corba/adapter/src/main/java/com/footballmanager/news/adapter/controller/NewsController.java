package com.footballmanager.news.adapter.controller;

import com.footballmanager.news.adapter.dto.NoticiaDto;
import com.footballmanager.news.adapter.mapper.NewsMapper;
import footballmanager.news.DatosInvalidos;
import footballmanager.news.Noticia;
import footballmanager.news.NoticiaNoEncontrada;
import footballmanager.news.ServicioNoticias;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/news")
public class NewsController {

    private final ServicioNoticias servicio;

    public NewsController(ServicioNoticias servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public List<NoticiaDto> listar() {
        Noticia[] todas = servicio.listarTodas();
        List<NoticiaDto> out = new ArrayList<>(todas.length);
        for (Noticia n : todas) {
            out.add(NewsMapper.toDto(n));
        }
        return out;
    }

    @GetMapping("/{id}")
    public NoticiaDto obtener(@PathVariable String id) throws NoticiaNoEncontrada {
        return NewsMapper.toDto(servicio.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<NoticiaDto> publicar(@Valid @RequestBody NoticiaDto dto)
            throws DatosInvalidos {
        Noticia corba = NewsMapper.toCorba(dto);
        String newId = servicio.publicar(corba);
        Noticia creada;
        try {
            creada = servicio.obtenerPorId(newId);
        } catch (NoticiaNoEncontrada e) {
            // Si justo despues de publicar otra peticion la desaloja por FIFO.
            corba.id = newId;
            creada = corba;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(NewsMapper.toDto(creada));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) throws NoticiaNoEncontrada {
        servicio.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
