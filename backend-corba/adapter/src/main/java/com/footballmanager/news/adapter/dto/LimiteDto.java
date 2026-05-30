package com.footballmanager.news.adapter.dto;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

public class LimiteDto {

    @NotNull
    @Min(1)
    @Max(10_000)
    private Integer limite;

    public LimiteDto() { }

    public LimiteDto(Integer limite) { this.limite = limite; }

    public Integer getLimite() { return limite; }
    public void setLimite(Integer limite) { this.limite = limite; }
}
