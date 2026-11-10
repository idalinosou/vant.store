package dev.vant.store.pedido;

import java.math.BigDecimal;

public interface VendasPorMes {

    Integer getAno();

    Integer getMes();

    BigDecimal getTotal();

    Long getPedidos();
}
