package dev.vant.store.painel;

import dev.vant.store.painel.dto.EstoqueBaixoResponse;
import dev.vant.store.painel.dto.EvolucaoVendasResponse;
import dev.vant.store.painel.dto.MaisVendidoResponse;
import dev.vant.store.painel.dto.PainelResponse;
import dev.vant.store.pedido.PedidoRepository;
import dev.vant.store.pedido.ProdutoMaisVendido;
import dev.vant.store.pedido.StatusPedido;
import dev.vant.store.pedido.VendasPorMes;
import dev.vant.store.produto.Produto;
import dev.vant.store.produto.ProdutoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PainelService {

    private static final int LIMITE_ESTOQUE_BAIXO = 3;

    private final PedidoRepository pedidos;
    private final ProdutoRepository produtos;

    public PainelService(PedidoRepository pedidos, ProdutoRepository produtos) {
        this.pedidos = pedidos;
        this.produtos = produtos;
    }

    @Transactional(readOnly = true)
    public PainelResponse gerar(YearMonth mes) {
        ZoneId fuso = ZoneId.systemDefault();
        Instant inicio = mes.atDay(1).atStartOfDay(fuso).toInstant();
        Instant fim = mes.plusMonths(1).atDay(1).atStartOfDay(fuso).toInstant().minusNanos(1);

        BigDecimal vendas = pedidos.somarVendas(StatusPedido.CANCELADO, inicio, fim);
        long quantidadePedidos = pedidos.contarVendas(StatusPedido.CANCELADO, inicio, fim);
        BigDecimal ticketMedio = quantidadePedidos == 0
                ? BigDecimal.ZERO.setScale(2)
                : vendas.divide(BigDecimal.valueOf(quantidadePedidos), 2, RoundingMode.HALF_UP);

        List<EstoqueBaixoResponse> estoque = produtos
                .findByAtivoTrueAndEstoqueLessThanEqualOrderByEstoqueAsc(LIMITE_ESTOQUE_BAIXO)
                .stream()
                .map(produto -> new EstoqueBaixoResponse(produto.getId(), produto.getNome(), produto.getEstoque()))
                .toList();

        List<MaisVendidoResponse> maisVendidos = pedidos
                .maisVendidos(StatusPedido.CANCELADO, inicio, fim, PageRequest.of(0, 5))
                .stream()
                .map(this::paraMaisVendido)
                .toList();

        return new PainelResponse(
                mes.toString(),
                vendas,
                quantidadePedidos,
                ticketMedio,
                pedidos.countByStatus(StatusPedido.PAGO),
                estoque,
                maisVendidos,
                evolucao(mes, fuso));
    }

    private List<EvolucaoVendasResponse> evolucao(YearMonth mes, ZoneId fuso) {
        Instant inicio = mes.minusMonths(5).atDay(1).atStartOfDay(fuso).toInstant();
        Instant fim = mes.plusMonths(1).atDay(1).atStartOfDay(fuso).toInstant().minusNanos(1);

        Map<YearMonth, VendasPorMes> porMes = new HashMap<>();
        for (VendasPorMes registro : pedidos.vendasPorMes(StatusPedido.CANCELADO, inicio, fim)) {
            porMes.put(YearMonth.of(registro.getAno(), registro.getMes()), registro);
        }

        List<EvolucaoVendasResponse> evolucao = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth referencia = mes.minusMonths(i);
            VendasPorMes registro = porMes.get(referencia);
            BigDecimal total = registro == null ? BigDecimal.ZERO.setScale(2) : registro.getTotal();
            long quantidade = registro == null ? 0 : registro.getPedidos();
            evolucao.add(new EvolucaoVendasResponse(referencia.toString(), total, quantidade));
        }
        return evolucao;
    }

    private MaisVendidoResponse paraMaisVendido(ProdutoMaisVendido registro) {
        return new MaisVendidoResponse(
                registro.getId(),
                registro.getNome(),
                registro.getQuantidade(),
                registro.getTotal());
    }
}
