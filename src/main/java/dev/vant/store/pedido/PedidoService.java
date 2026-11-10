package dev.vant.store.pedido;

import dev.vant.store.erro.RecursoNaoEncontradoException;
import dev.vant.store.erro.RegraDeNegocioException;
import dev.vant.store.pedido.dto.CheckoutRequest;
import dev.vant.store.pedido.dto.ItemCheckoutRequest;
import dev.vant.store.pedido.dto.ItemPedidoResponse;
import dev.vant.store.pedido.dto.PedidoResponse;
import dev.vant.store.produto.Produto;
import dev.vant.store.produto.ProdutoRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PedidoService {

    private final PedidoRepository repositorio;
    private final ProdutoRepository produtos;

    public PedidoService(PedidoRepository repositorio, ProdutoRepository produtos) {
        this.repositorio = repositorio;
        this.produtos = produtos;
    }

    @Transactional
    public PedidoResponse criar(CheckoutRequest pedido) {
        Map<Long, Integer> quantidades = new LinkedHashMap<>();
        for (ItemCheckoutRequest item : pedido.itens()) {
            quantidades.merge(item.produtoId(), item.quantidade(), Integer::sum);
        }
        if (quantidades.values().stream().anyMatch(quantidade -> quantidade > 99)) {
            throw new RegraDeNegocioException("A quantidade máxima por produto é 99.");
        }

        Pedido novo = new Pedido();
        novo.setClienteNome(pedido.clienteNome().trim());
        novo.setClienteEmail(pedido.clienteEmail().trim());
        novo.setFormaPagamento(pedido.formaPagamento());
        novo.setStatus(StatusPedido.PAGO);

        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<Long, Integer> linha : quantidades.entrySet()) {
            Produto produto = produtos.findById(linha.getKey())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Produto não encontrado."));
            int quantidade = linha.getValue();

            if (!produto.isAtivo()) {
                throw new RegraDeNegocioException("O produto \"" + produto.getNome() + "\" não está disponível.");
            }
            if (produto.getEstoque() < quantidade) {
                throw new RegraDeNegocioException(
                        "Estoque insuficiente para \"" + produto.getNome() + "\". Disponível: " + produto.getEstoque() + ".");
            }

            produto.setEstoque(produto.getEstoque() - quantidade);
            ItemPedido item = new ItemPedido();
            item.setProduto(produto);
            item.setNomeProduto(produto.getNome());
            item.setPrecoUnitario(produto.getPreco());
            item.setQuantidade(quantidade);
            novo.adicionarItem(item);
            total = total.add(produto.getPreco().multiply(BigDecimal.valueOf(quantidade)));
        }

        novo.setTotal(total.setScale(2, RoundingMode.HALF_UP));
        return paraResponse(repositorio.save(novo));
    }

    @Transactional(readOnly = true)
    public Page<PedidoResponse> listar(StatusPedido status, int pagina, int tamanho) {
        Specification<Pedido> filtro = (root, consulta, builder) -> status == null
                ? builder.conjunction()
                : builder.equal(root.get("status"), status);
        PageRequest paginacao = PageRequest.of(
                Math.max(pagina, 0),
                Math.min(Math.max(tamanho, 1), 24),
                Sort.by("criadoEm").descending().and(Sort.by("id").descending()));
        return repositorio.findAll(filtro, paginacao).map(this::paraResponse);
    }

    @Transactional(readOnly = true)
    public PedidoResponse buscar(Long id) {
        return paraResponse(buscarEntidade(id));
    }

    @Transactional
    public PedidoResponse alterarStatus(Long id, StatusPedido novo) {
        Pedido pedido = buscarEntidade(id);
        StatusPedido atual = pedido.getStatus();
        if (atual == novo) {
            return paraResponse(pedido);
        }

        boolean permitido = switch (atual) {
            case PAGO -> novo == StatusPedido.ENVIADO || novo == StatusPedido.CANCELADO;
            case ENVIADO -> novo == StatusPedido.ENTREGUE;
            case ENTREGUE, CANCELADO -> false;
        };
        if (!permitido) {
            throw new RegraDeNegocioException(mensagemTransicao(atual, novo));
        }

        if (novo == StatusPedido.CANCELADO) {
            devolverEstoque(pedido);
        }
        pedido.setStatus(novo);
        return paraResponse(pedido);
    }

    private void devolverEstoque(Pedido pedido) {
        for (ItemPedido item : pedido.getItens()) {
            Produto produto = item.getProduto();
            produto.setEstoque(produto.getEstoque() + item.getQuantidade());
        }
    }

    private String mensagemTransicao(StatusPedido atual, StatusPedido novo) {
        return switch (atual) {
            case ENTREGUE -> "Pedido já entregue não pode ser alterado.";
            case CANCELADO -> "Pedido cancelado não pode ser alterado.";
            case ENVIADO -> "Um pedido enviado só pode ser marcado como entregue.";
            case PAGO -> novo == StatusPedido.ENTREGUE
                    ? "Marque o pedido como enviado antes de marcá-lo como entregue."
                    : "Um pedido pago só pode ser enviado ou cancelado.";
        };
    }

    private Pedido buscarEntidade(Long id) {
        return repositorio.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Pedido não encontrado."));
    }

    private PedidoResponse paraResponse(Pedido pedido) {
        List<ItemPedidoResponse> itens = new ArrayList<>();
        for (ItemPedido item : pedido.getItens()) {
            itens.add(new ItemPedidoResponse(
                    item.getProduto().getId(),
                    item.getNomeProduto(),
                    item.getPrecoUnitario(),
                    item.getQuantidade(),
                    item.getSubtotal()));
        }
        return new PedidoResponse(
                pedido.getId(),
                pedido.getClienteNome(),
                pedido.getClienteEmail(),
                pedido.getFormaPagamento(),
                pedido.getStatus(),
                pedido.getTotal(),
                pedido.getCriadoEm(),
                itens);
    }
}
