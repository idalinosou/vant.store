package dev.vant.store.pedido.dto;

import dev.vant.store.pedido.StatusPedido;
import jakarta.validation.constraints.NotNull;

public record StatusRequest(
        @NotNull(message = "O status é obrigatório.")
        StatusPedido status) {
}
