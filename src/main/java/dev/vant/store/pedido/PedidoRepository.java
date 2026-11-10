package dev.vant.store.pedido;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface PedidoRepository extends JpaRepository<Pedido, Long>, JpaSpecificationExecutor<Pedido> {

    @Query("select coalesce(sum(p.total), 0) from Pedido p where p.status <> :cancelado and p.criadoEm between :inicio and :fim")
    BigDecimal somarVendas(@Param("cancelado") StatusPedido cancelado,
                           @Param("inicio") Instant inicio,
                           @Param("fim") Instant fim);

    @Query("select count(p) from Pedido p where p.status <> :cancelado and p.criadoEm between :inicio and :fim")
    long contarVendas(@Param("cancelado") StatusPedido cancelado,
                      @Param("inicio") Instant inicio,
                      @Param("fim") Instant fim);

    long countByStatus(StatusPedido status);

    @Query("""
            select year(p.criadoEm) as ano, month(p.criadoEm) as mes,
                   coalesce(sum(p.total), 0) as total, count(p) as pedidos
            from Pedido p
            where p.status <> :cancelado and p.criadoEm between :inicio and :fim
            group by year(p.criadoEm), month(p.criadoEm)
            """)
    List<VendasPorMes> vendasPorMes(@Param("cancelado") StatusPedido cancelado,
                                    @Param("inicio") Instant inicio,
                                    @Param("fim") Instant fim);

    @Query("""
            select i.produto.id as id, i.nomeProduto as nome,
                   sum(i.quantidade) as quantidade, sum(i.quantidade * i.precoUnitario) as total
            from ItemPedido i
            where i.pedido.status <> :cancelado and i.pedido.criadoEm between :inicio and :fim
            group by i.produto.id, i.nomeProduto
            order by sum(i.quantidade) desc
            """)
    List<ProdutoMaisVendido> maisVendidos(@Param("cancelado") StatusPedido cancelado,
                                          @Param("inicio") Instant inicio,
                                          @Param("fim") Instant fim,
                                          Pageable limite);
}
