package dev.vant.store.produto.dto;

import dev.vant.store.categoria.dto.CategoriaResponse;

import java.math.BigDecimal;
import java.time.Instant;

public record ProdutoResponse(
        Long id,
        String nome,
        String descricao,
        BigDecimal preco,
        int estoque,
        boolean ativo,
        CategoriaResponse categoria,
        Instant criadoEm) {
}
