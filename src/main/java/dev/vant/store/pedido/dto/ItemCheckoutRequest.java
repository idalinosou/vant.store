package dev.vant.store.pedido.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ItemCheckoutRequest(
        @NotNull(message = "O produto é obrigatório.")
        Long produtoId,

        @NotNull(message = "A quantidade é obrigatória.")
        @Min(value = 1, message = "A quantidade deve ser pelo menos 1.")
        @Max(value = 99, message = "A quantidade deve ser no máximo 99.")
        Integer quantidade) {
}
