package dev.vant.store.pedido;

import dev.vant.store.BaseIntegracao;
import dev.vant.store.categoria.Categoria;
import dev.vant.store.produto.Produto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PedidoIntegrationTest extends BaseIntegracao {

    private Produto teclado;
    private Produto mouse;

    @BeforeEach
    void prepararCatalogo() {
        Categoria categoria = categoria("Periféricos");
        teclado = produto("Teclado mecânico", "349.90", 10, categoria);
        mouse = produto("Mouse sem fio", "189.90", 20, categoria);
    }

    private Map<String, Object> checkout(Object... produtoEQuantidade) {
        List<Map<String, Object>> itens = new java.util.ArrayList<>();
        for (int i = 0; i < produtoEQuantidade.length; i += 2) {
            itens.add(Map.of(
                    "produtoId", ((Produto) produtoEQuantidade[i]).getId(),
                    "quantidade", produtoEQuantidade[i + 1]));
        }
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("clienteNome", "Marina Alves");
        corpo.put("clienteEmail", "marina@email.com");
        corpo.put("formaPagamento", "PIX");
        corpo.put("itens", itens);
        return corpo;
    }

    private int estoqueDe(Produto produto) {
        return produtos.findById(produto.getId()).orElseThrow().getEstoque();
    }

    @Test
    void checkoutCalculaTotalEBaixaEstoque() throws Exception {
        mvc.perform(post("/api/pedidos")
                        .contentType("application/json")
                        .content(json(checkout(teclado, 2, mouse, 1))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PAGO"))
                .andExpect(jsonPath("$.total").value(889.70))
                .andExpect(jsonPath("$.itens.length()").value(2))
                .andExpect(jsonPath("$.itens[0].nomeProduto").value("Teclado mecânico"))
                .andExpect(jsonPath("$.itens[0].subtotal").value(699.80));

        assertThat(estoqueDe(teclado)).isEqualTo(8);
        assertThat(estoqueDe(mouse)).isEqualTo(19);
        assertThat(pedidos.findAll()).hasSize(1);
    }

    @Test
    void agrupaItensRepetidos() throws Exception {
        mvc.perform(post("/api/pedidos")
                        .contentType("application/json")
                        .content(json(checkout(teclado, 1, teclado, 2))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.itens.length()").value(1))
                .andExpect(jsonPath("$.itens[0].quantidade").value(3))
                .andExpect(jsonPath("$.total").value(1049.70));

        assertThat(estoqueDe(teclado)).isEqualTo(7);
    }

    @Test
    void rejeitaEstoqueInsuficiente() throws Exception {
        mvc.perform(post("/api/pedidos")
                        .contentType("application/json")
                        .content(json(checkout(teclado, 99))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Estoque insuficiente para \"Teclado mecânico\". Disponível: 10."));

        assertThat(estoqueDe(teclado)).isEqualTo(10);
        assertThat(pedidos.findAll()).isEmpty();
    }

    @Test
    void rejeitaProdutoInativo() throws Exception {
        teclado.setAtivo(false);
        produtos.save(teclado);

        mvc.perform(post("/api/pedidos")
                        .contentType("application/json")
                        .content(json(checkout(teclado, 1))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("O produto \"Teclado mecânico\" não está disponível."));
    }

    @Test
    void rejeitaProdutoInexistente() throws Exception {
        Map<String, Object> corpo = checkout(teclado, 1);
        corpo.put("itens", List.of(Map.of("produtoId", 999, "quantidade", 1)));

        mvc.perform(post("/api/pedidos")
                        .contentType("application/json")
                        .content(json(corpo)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Produto não encontrado."));
    }

    @Test
    void rejeitaPedidoSemItens() throws Exception {
        mvc.perform(post("/api/pedidos")
                        .contentType("application/json")
                        .content(json(Map.of(
                                "clienteNome", "Marina Alves",
                                "clienteEmail", "marina@email.com",
                                "formaPagamento", "PIX",
                                "itens", List.of()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.itens").value("Inclua pelo menos um produto no pedido."));
    }

    @Test
    void validaQuantidadeEEmail() throws Exception {
        Map<String, Object> comQuantidadeZero = checkout(teclado, 1);
        comQuantidadeZero.put("itens", List.of(Map.of("produtoId", teclado.getId(), "quantidade", 0)));
        comQuantidadeZero.put("clienteEmail", "email-invalido");

        mvc.perform(post("/api/pedidos")
                        .contentType("application/json")
                        .content(json(comQuantidadeZero)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos['itens[0].quantidade']").exists())
                .andExpect(jsonPath("$.campos.clienteEmail").exists());
    }

    @Test
    void limitaQuantidadePorProduto() throws Exception {
        teclado.setEstoque(500);
        produtos.save(teclado);

        mvc.perform(post("/api/pedidos")
                        .contentType("application/json")
                        .content(json(checkout(teclado, 60, teclado, 40))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("A quantidade máxima por produto é 99."));
    }

    @Test
    void listaPedidosPorStatus() throws Exception {
        pedido(StatusPedido.PAGO, java.time.YearMonth.now(), 5, item(teclado, 1));
        pedido(StatusPedido.ENVIADO, java.time.YearMonth.now(), 6, item(mouse, 1));
        pedido(StatusPedido.ENTREGUE, java.time.YearMonth.now(), 7, item(teclado, 1));

        mvc.perform(get("/api/pedidos").param("status", "ENVIADO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].status").value("ENVIADO"))
                .andExpect(jsonPath("$.content[0].itens[0].nomeProduto").value("Mouse sem fio"));

        mvc.perform(get("/api/pedidos"))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].status").value("ENTREGUE"));
    }

    @Test
    void avancaStatusAteEntrega() throws Exception {
        Pedido criado = pedido(StatusPedido.PAGO, java.time.YearMonth.now(), 5, item(teclado, 1));

        mvc.perform(patch("/api/pedidos/" + criado.getId() + "/status")
                        .contentType("application/json")
                        .content(json(Map.of("status", "ENVIADO"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ENVIADO"));

        mvc.perform(patch("/api/pedidos/" + criado.getId() + "/status")
                        .contentType("application/json")
                        .content(json(Map.of("status", "ENTREGUE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ENTREGUE"));
    }

    @Test
    void bloqueiaPularEtapaDoStatus() throws Exception {
        Pedido criado = pedido(StatusPedido.PAGO, java.time.YearMonth.now(), 5, item(teclado, 1));

        mvc.perform(patch("/api/pedidos/" + criado.getId() + "/status")
                        .contentType("application/json")
                        .content(json(Map.of("status", "ENTREGUE"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Marque o pedido como enviado antes de marcá-lo como entregue."));
    }

    @Test
    void bloqueiaAlteracaoDePedidoEntregue() throws Exception {
        Pedido criado = pedido(StatusPedido.ENTREGUE, java.time.YearMonth.now(), 5, item(teclado, 1));

        mvc.perform(patch("/api/pedidos/" + criado.getId() + "/status")
                        .contentType("application/json")
                        .content(json(Map.of("status", "CANCELADO"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Pedido já entregue não pode ser alterado."));
    }

    @Test
    void cancelamentoDevolveEstoque() throws Exception {
        teclado.setEstoque(8);
        produtos.save(teclado);
        Pedido criado = pedido(StatusPedido.PAGO, java.time.YearMonth.now(), 5, item(teclado, 2));

        mvc.perform(patch("/api/pedidos/" + criado.getId() + "/status")
                        .contentType("application/json")
                        .content(json(Map.of("status", "CANCELADO"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADO"));

        assertThat(estoqueDe(teclado)).isEqualTo(10);
    }

    @Test
    void buscaPedidoInexistente() throws Exception {
        mvc.perform(get("/api/pedidos/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Pedido não encontrado."));
    }
}
