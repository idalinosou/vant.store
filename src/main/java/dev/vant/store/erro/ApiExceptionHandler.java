package dev.vant.store.erro;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ResponseEntity<ErroResponse> naoEncontrado(RecursoNaoEncontradoException excecao, HttpServletRequest pedido) {
        return resposta(HttpStatus.NOT_FOUND, excecao.getMessage(), pedido, null);
    }

    @ExceptionHandler(RegraDeNegocioException.class)
    public ResponseEntity<ErroResponse> regraDeNegocio(RegraDeNegocioException excecao, HttpServletRequest pedido) {
        return resposta(HttpStatus.CONFLICT, excecao.getMessage(), pedido, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponse> validacao(MethodArgumentNotValidException excecao, HttpServletRequest pedido) {
        Map<String, String> campos = new LinkedHashMap<>();
        for (FieldError erro : excecao.getBindingResult().getFieldErrors()) {
            campos.putIfAbsent(erro.getField(), erro.getDefaultMessage());
        }
        return resposta(HttpStatus.BAD_REQUEST, "Um ou mais campos estão inválidos.", pedido, campos);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErroResponse> corpoInvalido(HttpMessageNotReadableException excecao, HttpServletRequest pedido) {
        return resposta(HttpStatus.BAD_REQUEST, "Corpo da requisição inválido ou com valor não reconhecido.", pedido, null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErroResponse> parametroInvalido(MethodArgumentTypeMismatchException excecao, HttpServletRequest pedido) {
        String mensagem = "Parâmetro '" + excecao.getName() + "' inválido. Use o formato esperado.";
        if ("mes".equals(excecao.getName())) {
            mensagem = "Parâmetro 'mes' inválido. Use o formato AAAA-MM.";
        }
        return resposta(HttpStatus.BAD_REQUEST, mensagem, pedido, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroResponse> conflitoDeDados(DataIntegrityViolationException excecao, HttpServletRequest pedido) {
        return resposta(HttpStatus.CONFLICT, "Operação não permitida: os dados entram em conflito com um registro existente.", pedido, null);
    }

    private ResponseEntity<ErroResponse> resposta(HttpStatus status, String mensagem, HttpServletRequest pedido, Map<String, String> campos) {
        ErroResponse corpo = new ErroResponse(Instant.now(), status.value(), mensagem, pedido.getRequestURI(), campos);
        return ResponseEntity.status(status).body(corpo);
    }
}
