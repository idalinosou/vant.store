package dev.vant.store.pedido;

import dev.vant.store.pedido.dto.CheckoutRequest;
import dev.vant.store.pedido.dto.PedidoResponse;
import dev.vant.store.pedido.dto.StatusRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService servico;

    public PedidoController(PedidoService servico) {
        this.servico = servico;
    }

    @PostMapping
    public ResponseEntity<PedidoResponse> criar(@Valid @RequestBody CheckoutRequest pedido) {
        PedidoResponse criado = servico.criar(pedido);
        return ResponseEntity.created(URI.create("/api/pedidos/" + criado.id())).body(criado);
    }

    @GetMapping
    public Page<PedidoResponse> listar(
            @RequestParam(required = false) StatusPedido status,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho) {
        return servico.listar(status, pagina, tamanho);
    }

    @GetMapping("/{id}")
    public PedidoResponse buscar(@PathVariable Long id) {
        return servico.buscar(id);
    }

    @PatchMapping("/{id}/status")
    public PedidoResponse alterarStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest pedido) {
        return servico.alterarStatus(id, pedido.status());
    }
}
