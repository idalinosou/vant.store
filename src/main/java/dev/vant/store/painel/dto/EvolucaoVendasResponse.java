package dev.vant.store.painel.dto;

import java.math.BigDecimal;

public record EvolucaoVendasResponse(String mes, BigDecimal total, long pedidos) {
}
