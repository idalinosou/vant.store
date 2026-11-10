package dev.vant.store.produto;

import dev.vant.store.BaseIntegracao;
import dev.vant.store.categoria.Categoria;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProdutoIntegrationTest extends BaseIntegracao {

    private Map<String, Object> produtoJson(String nome, String preco, int estoque, Long categoriaId, Boolean ativo) {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("nome", nome);
        corpo.put("descricao", "Produto de teste");
        corpo.put("preco", new BigDecimal(preco));
        corpo.put("estoque", estoque);
        corpo.put("categoriaId", categoriaId);
        corpo.put("ativo", ativo);
        return corpo;
    }

    @Test
    void criaProduto() throws Exception {
        Categoria categoria = categoria("Periféricos");

        mvc.perform(post("/api/produtos")
                        .contentType("application/json")
                        .content(json(produtoJson("Teclado mecânico", "349.90", 10, categoria.getId(), null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Teclado mecânico"))
                .andExpect(jsonPath("$.preco").value(349.90))
                .andExpect(jsonPath("$.estoque").value(10))
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(jsonPath("$.categoria.nome").value("Periféricos"));
    }

    @Test
    void validaCamposObrigatorios() throws Exception {
        mvc.perform(post("/api/produtos")
                        .contentType("application/json")
                        .content(json(Map.of("nome", "", "preco", -1, "estoque", -5))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").exists())
                .andExpect(jsonPath("$.campos.preco").exists())
                .andExpect(jsonPath("$.campos.estoque").exists())
                .andExpect(jsonPath("$.campos.categoriaId").exists());
    }

    @Test
    void rejeitaCategoriaInexistente() throws Exception {
        mvc.perform(post("/api/produtos")
                        .contentType("application/json")
                        .content(json(produtoJson("Monitor", "999.00", 3, 999L, true))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Categoria não encontrada."));
    }

    @Test
    void rejeitaNomeDuplicado() throws Exception {
        Categoria categoria = categoria("Setup");
        produto("Monitor 27", "1499.00", 5, categoria);

        mvc.perform(post("/api/produtos")
                        .contentType("application/json")
                        .content(json(produtoJson("monitor 27", "1200.00", 2, categoria.getId(), true))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Já existe um produto com esse nome."));
    }

    @Test
    void buscaPorNomeOuDescricao() throws Exception {
        Categoria categoria = categoria("Periféricos");
        produto("Teclado mecânico", "349.90", 10, categoria);
        produto("Mouse sem fio", "189.90", 10, categoria);

        mvc.perform(get("/api/produtos").param("busca", "MECÂNICO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].nome").value("Teclado mecânico"));

        mvc.perform(get("/api/produtos").param("busca", "sem fio"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].nome").value("Mouse sem fio"));
    }

    @Test
    void filtraPorCategoriaEAtivo() throws Exception {
        Categoria perifericos = categoria("Periféricos");
        Categoria audio = categoria("Áudio");
        produto("Teclado", "199.90", 5, perifericos);
        produto("Headset", "299.90", 5, audio);
        Produto foraDeLinha = produto("Webcam antiga", "99.90", 0, perifericos);
        foraDeLinha.setAtivo(false);
        produtos.save(foraDeLinha);

        mvc.perform(get("/api/produtos")
                        .param("categoriaId", perifericos.getId().toString())
                        .param("ativo", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].nome").value("Teclado"));
    }

    @Test
    void ordenaPorPrecoDecrescente() throws Exception {
        Categoria categoria = categoria("Geral");
        produto("Barato", "50.00", 5, categoria);
        produto("Caro", "500.00", 5, categoria);
        produto("Médio", "250.00", 5, categoria);

        mvc.perform(get("/api/produtos").param("ordenar", "preco-desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nome").value("Caro"))
                .andExpect(jsonPath("$.content[1].nome").value("Médio"))
                .andExpect(jsonPath("$.content[2].nome").value("Barato"));
    }

    @Test
    void atualizaProduto() throws Exception {
        Categoria categoria = categoria("Setup");
        Produto produto = produto("Suporte", "129.90", 4, categoria);
        categoria("Acessórios");

        Long acessorios = categorias.findAllByOrderByNomeAsc().stream()
                .filter(item -> item.getNome().equals("Acessórios"))
                .findFirst()
                .orElseThrow()
                .getId();

        mvc.perform(put("/api/produtos/" + produto.getId())
                        .contentType("application/json")
                        .content(json(produtoJson("Suporte ajustável", "149.90", 6, acessorios, false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Suporte ajustável"))
                .andExpect(jsonPath("$.preco").value(149.90))
                .andExpect(jsonPath("$.estoque").value(6))
                .andExpect(jsonPath("$.ativo").value(false))
                .andExpect(jsonPath("$.categoria.id").value(acessorios));
    }

    @Test
    void bloqueiaExclusaoDeProdutoJaVendido() throws Exception {
        Categoria categoria = categoria("Periféricos");
        Produto produto = produto("Teclado", "199.90", 5, categoria);
        pedido(dev.vant.store.pedido.StatusPedido.PAGO, java.time.YearMonth.now(), 5, item(produto, 1));

        mvc.perform(delete("/api/produtos/" + produto.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value(
                        "Este produto já aparece em pedidos e não pode ser excluído. Desative-o para tirar da loja."));
    }

    @Test
    void excluiProdutoSemPedidos() throws Exception {
        Categoria categoria = categoria("Extras");
        Produto produto = produto("Adesivo", "9.90", 50, categoria);

        mvc.perform(delete("/api/produtos/" + produto.getId()))
                .andExpect(status().isNoContent());

        assertThat(produtos.existsById(produto.getId())).isFalse();
    }
}
