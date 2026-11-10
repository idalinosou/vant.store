package dev.vant.store.produto.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProdutoRequest(
        @NotBlank(message = "O nome do produto é obrigatório.")
        @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.")
        String nome,

        @Size(max = 400, message = "A descrição deve ter no máximo 400 caracteres.")
        String descricao,

        @NotNull(message = "O preço é obrigatório.")
        @Positive(message = "O preço deve ser maior que zero.")
        @Digits(integer = 8, fraction = 2, message = "Use no máximo 8 dígitos e 2 casas decimais.")
        BigDecimal preco,

        @NotNull(message = "O estoque é obrigatório.")
        @PositiveOrZero(message = "O estoque não pode ser negativo.")
        @Max(value = 9999, message = "O estoque deve ser no máximo 9999.")
        Integer estoque,

        @NotNull(message = "A categoria é obrigatória.")
        Long categoriaId,

        Boolean ativo) {
}
