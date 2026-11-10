package dev.vant.store.categoria;

import dev.vant.store.categoria.dto.CategoriaRequest;
import dev.vant.store.categoria.dto.CategoriaResponse;
import dev.vant.store.erro.RecursoNaoEncontradoException;
import dev.vant.store.erro.RegraDeNegocioException;
import dev.vant.store.produto.ProdutoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Collator;
import java.util.List;
import java.util.Locale;

@Service
public class CategoriaService {

    private static final Collator ORDEM_PORTUGUES = Collator.getInstance(Locale.forLanguageTag("pt-BR"));

    private final CategoriaRepository repositorio;
    private final ProdutoRepository produtos;

    public CategoriaService(CategoriaRepository repositorio, ProdutoRepository produtos) {
        this.repositorio = repositorio;
        this.produtos = produtos;
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listar() {
        return repositorio.findAll().stream()
                .map(this::paraResponse)
                .sorted((a, b) -> ORDEM_PORTUGUES.compare(a.nome(), b.nome()))
                .toList();
    }

    @Transactional
    public CategoriaResponse criar(CategoriaRequest pedido) {
        String nome = pedido.nome().trim();
        if (repositorio.existsByNomeIgnoreCase(nome)) {
            throw new RegraDeNegocioException("Já existe uma categoria com esse nome.");
        }

        Categoria categoria = new Categoria();
        categoria.setNome(nome);
        return paraResponse(repositorio.save(categoria));
    }

    @Transactional
    public void excluir(Long id) {
        Categoria categoria = buscar(id);
        if (produtos.existsByCategoriaId(id)) {
            throw new RegraDeNegocioException("Não é possível excluir uma categoria que ainda tem produtos.");
        }
        repositorio.delete(categoria);
    }

    public Categoria buscarEntidade(Long id) {
        return buscar(id);
    }

    private Categoria buscar(Long id) {
        return repositorio.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria não encontrada."));
    }

    private CategoriaResponse paraResponse(Categoria categoria) {
        return new CategoriaResponse(categoria.getId(), categoria.getNome());
    }
}
