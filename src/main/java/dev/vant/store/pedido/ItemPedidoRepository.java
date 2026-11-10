package dev.vant.store.pedido;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemPedidoRepository extends JpaRepository<ItemPedido, Long> {

    boolean existsByProdutoId(Long produtoId);
}
