package dev.vant.store.pedido.dto;

import dev.vant.store.pedido.FormaPagamento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CheckoutRequest(
        @NotBlank(message = "O nome do cliente é obrigatório.")
        @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.")
        String clienteNome,

        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 160, message = "O e-mail deve ter no máximo 160 caracteres.")
        String clienteEmail,

        @NotNull(message = "A forma de pagamento é obrigatória.")
        FormaPagamento formaPagamento,

        @NotEmpty(message = "Inclua pelo menos um produto no pedido.")
        List<@Valid ItemCheckoutRequest> itens) {
}
