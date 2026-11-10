package dev.vant.store.categoria;

import dev.vant.store.BaseIntegracao;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CategoriaIntegrationTest extends BaseIntegracao {

    @Test
    void listaCategoriasEmOrdemAlfabetica() throws Exception {
        categoria("Áudio");
        categoria("Acessórios");
        categoria("Periféricos");

        mvc.perform(get("/api/categorias"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].nome").value("Acessórios"))
                .andExpect(jsonPath("$[1].nome").value("Áudio"))
                .andExpect(jsonPath("$[2].nome").value("Periféricos"));
    }

    @Test
    void criaCategoria() throws Exception {
        mvc.perform(post("/api/categorias")
                        .contentType("application/json")
                        .content(json(Map.of("nome", "  Iluminação  "))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Iluminação"));
    }

    @Test
    void rejeitaNomeDuplicado() throws Exception {
        categoria("Setup");

        mvc.perform(post("/api/categorias")
                        .contentType("application/json")
                        .content(json(Map.of("nome", "setup"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Já existe uma categoria com esse nome."));
    }

    @Test
    void rejeitaNomeEmBranco() throws Exception {
        mvc.perform(post("/api/categorias")
                        .contentType("application/json")
                        .content(json(Map.of("nome", "   "))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").exists());
    }

    @Test
    void excluiCategoriaSemProdutos() throws Exception {
        Categoria categoria = categoria("Temporária");

        mvc.perform(delete("/api/categorias/" + categoria.getId()))
                .andExpect(status().isNoContent());

        assertThat(categorias.existsById(categoria.getId())).isFalse();
    }

    @Test
    void bloqueiaExclusaoDeCategoriaComProdutos() throws Exception {
        Categoria categoria = categoria("Periféricos");
        produto("Teclado", "199.90", 5, categoria);

        mvc.perform(delete("/api/categorias/" + categoria.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Não é possível excluir uma categoria que ainda tem produtos."));
    }
}
