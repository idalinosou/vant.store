package dev.vant.store.painel;

import dev.vant.store.BaseIntegracao;
import dev.vant.store.categoria.Categoria;
import dev.vant.store.pedido.StatusPedido;
import dev.vant.store.produto.Produto;
import org.junit.jupiter.api.Test;

import java.time.YearMonth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PainelIntegrationTest extends BaseIntegracao {

    @Test
    void somaVendasDoMesIgnorandoCancelados() throws Exception {
        Categoria categoria = categoria("Periféricos");
        Produto teclado = produto("Teclado", "300.00", 10, categoria);
        Produto mouse = produto("Mouse", "100.00", 10, categoria);
        YearMonth mes = YearMonth.now();

        pedido(StatusPedido.PAGO, mes, 2, item(teclado, 1));
        pedido(StatusPedido.ENTREGUE, mes, 3, item(mouse, 2));
        pedido(StatusPedido.CANCELADO, mes, 4, item(teclado, 1));

        mvc.perform(get("/api/painel").param("mes", mes.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mes").value(mes.toString()))
                .andExpect(jsonPath("$.vendas").value(500.00))
                .andExpect(jsonPath("$.pedidos").value(2))
                .andExpect(jsonPath("$.ticketMedio").value(250.00))
                .andExpect(jsonPath("$.pedidosAbertos").value(1));
    }

    @Test
    void listaEstoqueBaixoEMaisVendidos() throws Exception {
        Categoria categoria = categoria("Geral");
        Produto esgotado = produto("Caixa de som", "259.90", 0, categoria);
        Produto ultimasUnidades = produto("Webcam", "279.90", 3, categoria);
        Produto saudavel = produto("Mousepad", "89.90", 30, categoria);
        Produto inativo = produto("Modelo antigo", "49.90", 0, categoria);
        inativo.setAtivo(false);
        produtos.save(inativo);
        YearMonth mes = YearMonth.now();

        pedido(StatusPedido.ENTREGUE, mes, 2, item(esgotado, 1), item(saudavel, 3));
        pedido(StatusPedido.PAGO, mes, 3, item(saudavel, 2));

        mvc.perform(get("/api/painel").param("mes", mes.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estoqueBaixo.length()").value(2))
                .andExpect(jsonPath("$.estoqueBaixo[0].nome").value("Caixa de som"))
                .andExpect(jsonPath("$.estoqueBaixo[1].estoque").value(3))
                .andExpect(jsonPath("$.maisVendidos[0].nome").value("Mousepad"))
                .andExpect(jsonPath("$.maisVendidos[0].quantidade").value(5))
                .andExpect(jsonPath("$.maisVendidos[0].total").value(449.50));
    }

    @Test
    void evolucaoTemSeisMesesEPreencherComZeros() throws Exception {
        Categoria categoria = categoria("Geral");
        Produto produto = produto("Teclado", "100.00", 10, categoria);
        YearMonth mes = YearMonth.now();
        pedido(StatusPedido.PAGO, mes.minusMonths(2), 10, item(produto, 2));

        mvc.perform(get("/api/painel").param("mes", mes.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evolucao.length()").value(6))
                .andExpect(jsonPath("$.evolucao[5].mes").value(mes.toString()))
                .andExpect(jsonPath("$.evolucao[5].total").value(0.00))
                .andExpect(jsonPath("$.evolucao[3].mes").value(mes.minusMonths(2).toString()))
                .andExpect(jsonPath("$.evolucao[3].total").value(200.00))
                .andExpect(jsonPath("$.evolucao[3].pedidos").value(1));
    }

    @Test
    void retornaZerosParaMesSemVendas() throws Exception {
        mvc.perform(get("/api/painel").param("mes", "2020-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vendas").value(0.00))
                .andExpect(jsonPath("$.pedidos").value(0))
                .andExpect(jsonPath("$.ticketMedio").value(0.00))
                .andExpect(jsonPath("$.maisVendidos.length()").value(0))
                .andExpect(jsonPath("$.evolucao.length()").value(6));
    }

    @Test
    void validaParametroDeMes() throws Exception {
        mvc.perform(get("/api/painel").param("mes", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Parâmetro 'mes' inválido. Use o formato AAAA-MM."));
    }
}
