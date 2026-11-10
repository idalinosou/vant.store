package dev.vant.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.vant.store.categoria.Categoria;
import dev.vant.store.categoria.CategoriaRepository;
import dev.vant.store.pedido.FormaPagamento;
import dev.vant.store.pedido.ItemPedido;
import dev.vant.store.pedido.Pedido;
import dev.vant.store.pedido.PedidoRepository;
import dev.vant.store.pedido.StatusPedido;
import dev.vant.store.produto.Produto;
import dev.vant.store.produto.ProdutoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class BaseIntegracao {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper json;

    @Autowired
    protected CategoriaRepository categorias;

    @Autowired
    protected ProdutoRepository produtos;

    @Autowired
    protected PedidoRepository pedidos;

    protected Categoria categoria(String nome) {
        Categoria categoria = new Categoria();
        categoria.setNome(nome);
        return categorias.save(categoria);
    }

    protected Produto produto(String nome, String preco, int estoque, Categoria categoria) {
        Produto produto = new Produto();
        produto.setNome(nome);
        produto.setDescricao("Descrição de " + nome);
        produto.setPreco(new BigDecimal(preco));
        produto.setEstoque(estoque);
        produto.setCategoria(categoria);
        return produtos.save(produto);
    }

    protected Pedido pedido(StatusPedido status, YearMonth mes, int dia, ItemPedido... itens) {
        Pedido pedido = new Pedido();
        pedido.setClienteNome("Cliente de teste");
        pedido.setClienteEmail("cliente@teste.com");
        pedido.setFormaPagamento(FormaPagamento.PIX);
        pedido.setStatus(status);
        BigDecimal total = BigDecimal.ZERO;
        for (ItemPedido item : itens) {
            if (item.getNomeProduto() == null) {
                item.setNomeProduto(item.getProduto().getNome());
            }
            if (item.getPrecoUnitario() == null) {
                item.setPrecoUnitario(item.getProduto().getPreco());
            }
            total = total.add(item.getPrecoUnitario().multiply(BigDecimal.valueOf(item.getQuantidade())));
            pedido.adicionarItem(item);
        }
        pedido.setTotal(total);
        pedido.setCriadoEm(mes.atDay(dia).atTime(14, 0).atZone(ZoneId.systemDefault()).toInstant());
        return pedidos.save(pedido);
    }

    protected ItemPedido item(Produto produto, int quantidade) {
        ItemPedido item = new ItemPedido();
        item.setProduto(produto);
        item.setQuantidade(quantidade);
        return item;
    }

    protected String json(Object valor) throws Exception {
        return json.writeValueAsString(valor);
    }

    protected Instant instante(YearMonth mes, int dia) {
        return mes.atDay(dia).atTime(14, 0).atZone(ZoneId.systemDefault()).toInstant();
    }
}
