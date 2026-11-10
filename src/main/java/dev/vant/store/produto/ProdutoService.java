package dev.vant.store.produto;

import dev.vant.store.categoria.Categoria;
import dev.vant.store.categoria.CategoriaService;
import dev.vant.store.categoria.dto.CategoriaResponse;
import dev.vant.store.erro.RecursoNaoEncontradoException;
import dev.vant.store.erro.RegraDeNegocioException;
import dev.vant.store.pedido.ItemPedidoRepository;
import dev.vant.store.produto.dto.ProdutoRequest;
import dev.vant.store.produto.dto.ProdutoResponse;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProdutoService {

    private final ProdutoRepository repositorio;
    private final CategoriaService categorias;
    private final ItemPedidoRepository itens;

    public ProdutoService(ProdutoRepository repositorio, CategoriaService categorias, ItemPedidoRepository itens) {
        this.repositorio = repositorio;
        this.categorias = categorias;
        this.itens = itens;
    }

    @Transactional(readOnly = true)
    public Page<ProdutoResponse> listar(String busca, Long categoriaId, Boolean ativo, int pagina, int tamanho, String ordenar) {
        Specification<Produto> filtro = (root, consulta, builder) -> {
            List<Predicate> condicoes = new ArrayList<>();
            if (busca != null && !busca.isBlank()) {
                String trecho = "%" + busca.trim().toLowerCase() + "%";
                condicoes.add(builder.or(
                        builder.like(builder.lower(root.get("nome")), trecho),
                        builder.like(builder.lower(root.get("descricao")), trecho)));
            }
            if (categoriaId != null) {
                condicoes.add(builder.equal(root.get("categoria").get("id"), categoriaId));
            }
            if (ativo != null) {
                condicoes.add(builder.equal(root.get("ativo"), ativo));
            }
            return builder.and(condicoes.toArray(new Predicate[0]));
        };

        int tamanhoSeguro = Math.min(Math.max(tamanho, 1), 48);
        PageRequest paginacao = PageRequest.of(Math.max(pagina, 0), tamanhoSeguro, ordenacao(ordenar));
        return repositorio.findAll(filtro, paginacao).map(this::paraResponse);
    }

    @Transactional(readOnly = true)
    public ProdutoResponse buscar(Long id) {
        return paraResponse(buscarEntidade(id));
    }

    @Transactional
    public ProdutoResponse criar(ProdutoRequest pedido) {
        String nome = pedido.nome().trim();
        if (repositorio.existsByNomeIgnoreCase(nome)) {
            throw new RegraDeNegocioException("Já existe um produto com esse nome.");
        }

        Categoria categoria = categorias.buscarEntidade(pedido.categoriaId());
        Produto produto = new Produto();
        aplicarDados(produto, pedido, categoria);
        produto.setAtivo(pedido.ativo() == null || pedido.ativo());
        return paraResponse(repositorio.save(produto));
    }

    @Transactional
    public ProdutoResponse atualizar(Long id, ProdutoRequest pedido) {
        Produto produto = buscarEntidade(id);
        String nome = pedido.nome().trim();
        if (repositorio.existsByNomeIgnoreCaseAndIdNot(nome, id)) {
            throw new RegraDeNegocioException("Já existe um produto com esse nome.");
        }

        Categoria categoria = categorias.buscarEntidade(pedido.categoriaId());
        aplicarDados(produto, pedido, categoria);
        if (pedido.ativo() != null) {
            produto.setAtivo(pedido.ativo());
        }
        return paraResponse(repositorio.save(produto));
    }

    @Transactional
    public void excluir(Long id) {
        Produto produto = buscarEntidade(id);
        if (itens.existsByProdutoId(id)) {
            throw new RegraDeNegocioException("Este produto já aparece em pedidos e não pode ser excluído. Desative-o para tirar da loja.");
        }
        repositorio.delete(produto);
    }

    private void aplicarDados(Produto produto, ProdutoRequest pedido, Categoria categoria) {
        produto.setNome(pedido.nome().trim());
        produto.setDescricao(pedido.descricao() == null || pedido.descricao().isBlank() ? null : pedido.descricao().trim());
        produto.setPreco(pedido.preco().setScale(2, RoundingMode.HALF_UP));
        produto.setEstoque(pedido.estoque());
        produto.setCategoria(categoria);
    }

    private Produto buscarEntidade(Long id) {
        return repositorio.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Produto não encontrado."));
    }

    private Sort ordenacao(String chave) {
        return switch (chave == null ? "nome" : chave) {
            case "preco-asc" -> Sort.by("preco").ascending().and(Sort.by("nome"));
            case "preco-desc" -> Sort.by("preco").descending().and(Sort.by("nome"));
            case "novidades" -> Sort.by("criadoEm").descending().and(Sort.by("id").descending());
            case "estoque" -> Sort.by("estoque").ascending().and(Sort.by("nome"));
            default -> Sort.by("nome").ascending();
        };
    }

    private ProdutoResponse paraResponse(Produto produto) {
        Categoria categoria = produto.getCategoria();
        return new ProdutoResponse(
                produto.getId(),
                produto.getNome(),
                produto.getDescricao(),
                produto.getPreco(),
                produto.getEstoque(),
                produto.isAtivo(),
                new CategoriaResponse(categoria.getId(), categoria.getNome()),
                produto.getCriadoEm());
    }
}
