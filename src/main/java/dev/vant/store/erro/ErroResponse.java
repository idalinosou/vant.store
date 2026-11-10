package dev.vant.store.erro;

import java.time.Instant;
import java.util.Map;

public record ErroResponse(
        Instant momento,
        int status,
        String erro,
        String caminho,
        Map<String, String> campos) {
}
