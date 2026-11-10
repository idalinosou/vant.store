package dev.vant.store.pedido.dto;

import dev.vant.store.pedido.FormaPagamento;
import dev.vant.store.pedido.StatusPedido;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PedidoResponse(
        Long id,
        String clienteNome,
        String clienteEmail,
        FormaPagamento formaPagamento,
        StatusPedido status,
        BigDecimal total,
        Instant criadoEm,
        List<ItemPedidoResponse> itens) {
}
