package dev.vant.store.painel;

import dev.vant.store.painel.dto.PainelResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

@RestController
@RequestMapping("/api/painel")
public class PainelController {

    private final PainelService servico;

    public PainelController(PainelService servico) {
        this.servico = servico;
    }

    @GetMapping
    public PainelResponse painel(
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes) {
        return servico.gerar(mes == null ? YearMonth.now() : mes);
    }
}
