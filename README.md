# vant.store

Loja virtual full stack: API REST em Java 21 + Spring Boot e interface web em HTML, CSS e JavaScript puro. O catálogo tem busca, filtros e ordenação, o carrinho respeita o estoque real e o checkout simulado gera pedidos que passam por pagamento, envio, entrega ou cancelamento.

**Demonstração:** https://idalinosou.github.io/vant.store/

A demonstração no GitHub Pages funciona sem servidor: catálogo, carrinho e pedidos ficam salvos no `localStorage` do navegador. A API real roda em Spring Boot e pode ser executada localmente.

## Funcionalidades

- Catálogo com busca por nome ou descrição, filtro por categoria, ordenação e paginação
- Carrinho com controle de quantidade limitado ao estoque disponível
- Checkout simulado com nome, e-mail e pagamento por PIX, cartão ou boleto
- Pedidos com fluxo de status: pago → enviado → entregue, com cancelamento
- Cancelamento devolve automaticamente as unidades ao estoque
- Painel com vendas do mês, ticket médio, pedidos abertos, estoque baixo, mais vendidos e evolução de seis meses
- Cadastro, edição, ativação e exclusão de produtos, além de categorias
- Validações, mensagens de erro claras e confirmação em duas etapas para exclusões
- Interface responsiva, acessível e com tema escuro

## Stack

- Java 21
- Spring Boot 3.4
- Spring Web, Spring Data JPA e Bean Validation
- H2 Database
- Maven
- HTML, CSS e JavaScript sem frameworks

## Como rodar

Pré-requisitos: Java 21 e Maven.

```bash
mvn spring-boot:run
```

Depois acesse http://localhost:8082.

O banco fica em `./dados/vantstore.mv.db` e já começa com produtos e pedidos de exemplo. Para recomeçar do zero, pare a aplicação e apague a pasta `dados`. O console do H2 fica em http://localhost:8082/h2-console.

## Testes

```bash
mvn test
```

São 35 testes de integração com MockMvc cobrindo categorias, produtos, checkout, estoque, transições de status, filtros, paginação e agregações do painel.

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/categorias` | Lista categorias em ordem alfabética |
| POST | `/api/categorias` | Cria uma categoria |
| DELETE | `/api/categorias/{id}` | Exclui uma categoria sem produtos |
| GET | `/api/produtos` | Lista produtos com `busca`, `categoriaId`, `ativo`, `pagina`, `tamanho` e `ordenar` |
| GET | `/api/produtos/{id}` | Busca um produto |
| POST | `/api/produtos` | Cria um produto |
| PUT | `/api/produtos/{id}` | Atualiza um produto |
| DELETE | `/api/produtos/{id}` | Exclui um produto que ainda não foi vendido |
| GET | `/api/pedidos` | Lista pedidos com filtro `status` e paginação |
| GET | `/api/pedidos/{id}` | Busca um pedido com os itens |
| POST | `/api/pedidos` | Registra um pedido e baixa o estoque |
| PATCH | `/api/pedidos/{id}/status` | Altera o status do pedido |
| GET | `/api/painel?mes=AAAA-MM` | Retorna os indicadores do mês e a evolução de seis meses |

Ordenações aceitas em `/api/produtos`: `nome`, `novidades`, `preco-asc`, `preco-desc` e `estoque`.

## Regras de negócio

- O checkout agrupa linhas repetidas do mesmo produto antes de validar.
- Cada produto aceita no máximo 99 unidades por pedido.
- Produto inativo ou sem estoque suficiente bloqueia o pedido com mensagem explicando o motivo.
- Pedido pago só pode ser enviado ou cancelado; enviado só pode ser entregue; entregue e cancelado não podem ser alterados.
- Categoria com produtos e produto que já aparece em pedidos não podem ser excluídos.
- Produtos fora de linha podem ser desativados em vez de excluídos.

## Estrutura

```
src/main/java/dev/vant/store
├── categoria      categorias, regras e endpoints
├── produto        catálogo, filtros e endpoints
├── pedido         checkout, itens, status e endpoints
├── painel         indicadores mensais
├── dados          carga inicial de exemplo
└── erro           tratamento centralizado de erros
```

A interface fica em `src/main/resources/static` e é copiada para `docs/` na publicação do GitHub Pages.
