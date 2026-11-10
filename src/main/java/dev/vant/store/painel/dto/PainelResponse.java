package dev.vant.store.painel.dto;

import java.math.BigDecimal;
import java.util.List;

public record PainelResponse(
        String mes,
        BigDecimal vendas,
        long pedidos,
        BigDecimal ticketMedio,
        long pedidosAbertos,
        List<EstoqueBaixoResponse> estoqueBaixo,
        List<MaisVendidoResponse> maisVendidos,
        List<EvolucaoVendasResponse> evolucao) {
}
