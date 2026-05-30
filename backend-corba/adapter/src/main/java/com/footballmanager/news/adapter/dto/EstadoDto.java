package com.footballmanager.news.adapter.dto;

public class EstadoDto {
    private int totalNoticias;
    private int limiteMaximo;
    private String fechaUltimoReset;

    public EstadoDto() { }

    public EstadoDto(int totalNoticias, int limiteMaximo, String fechaUltimoReset) {
        this.totalNoticias = totalNoticias;
        this.limiteMaximo = limiteMaximo;
        this.fechaUltimoReset = fechaUltimoReset;
    }

    public int getTotalNoticias() { return totalNoticias; }
    public void setTotalNoticias(int totalNoticias) { this.totalNoticias = totalNoticias; }
    public int getLimiteMaximo() { return limiteMaximo; }
    public void setLimiteMaximo(int limiteMaximo) { this.limiteMaximo = limiteMaximo; }
    public String getFechaUltimoReset() { return fechaUltimoReset; }
    public void setFechaUltimoReset(String fechaUltimoReset) { this.fechaUltimoReset = fechaUltimoReset; }
}
