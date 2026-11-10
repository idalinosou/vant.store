package dev.vant.store.pedido;

import java.math.BigDecimal;

public interface ProdutoMaisVendido {

    Long getId();

    String getNome();

    Long getQuantidade();

    BigDecimal getTotal();
}
