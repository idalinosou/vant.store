package dev.vant.store.painel.dto;

import java.math.BigDecimal;

public record MaisVendidoResponse(Long id, String nome, long quantidade, BigDecimal total) {
}
