package dev.vant.store.pedido.dto;

import java.math.BigDecimal;

public record ItemPedidoResponse(
        Long produtoId,
        String nomeProduto,
        BigDecimal precoUnitario,
        int quantidade,
        BigDecimal subtotal) {
}
