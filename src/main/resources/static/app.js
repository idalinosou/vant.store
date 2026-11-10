"use strict";

const CHAVE_CARRINHO = "vant.store.carrinho.v1";
const CHAVE_DEMO = "vant.store.demo.v1";
const TAMANHO_LOJA = 8;
const TAMANHO_PEDIDOS = 6;
const LIMITE_ESTOQUE_BAIXO = 3;

const FORMAS = { PIX: "PIX", CARTAO: "Cartão", BOLETO: "Boleto" };
const STATUS = {
  PAGO: { rotulo: "Pago", classe: "pago" },
  ENVIADO: { rotulo: "Enviado", classe: "enviado" },
  ENTREGUE: { rotulo: "Entregue", classe: "entregue" },
  CANCELADO: { rotulo: "Cancelado", classe: "cancelado" }
};
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const el = {};
[
  "selo-modo", "carrinho-contagem", "abrir-carrinho", "chips-categorias", "busca", "ordenar",
  "aviso-loja", "grade-produtos", "paginacao-loja", "chips-status", "lista-pedidos",
  "paginacao-pedidos", "mes-painel", "cards-painel", "evolucao-painel", "lista-estoque",
  "lista-mais-vendidos", "titulo-form-produto", "cancelar-edicao", "form-produto", "produto-id",
  "produto-nome", "produto-descricao", "produto-preco", "produto-estoque", "produto-categoria",
  "produto-ativo", "erro-produto", "salvar-produto", "total-catalogo", "corpo-catalogo",
  "form-categoria", "nome-categoria", "erro-categoria", "lista-categorias", "total-categorias",
  "sobreposicao", "gaveta", "fechar-carrinho", "itens-carrinho", "subtotal-carrinho",
  "ir-checkout", "dialogo-checkout", "titulo-checkout", "fechar-checkout", "form-checkout", "checkout-campos",
  "cliente-nome", "cliente-email", "resumo-checkout", "erro-checkout", "confirmar-pedido",
  "checkout-sucesso", "numero-pedido", "resumo-pedido", "ver-pedidos", "continuar-comprando", "toast"
].forEach((id) => {
  el[id.replace(/-(\w)/g, (_, letra) => letra.toUpperCase())] = document.getElementById(id);
});

const estado = {
  modo: "demo",
  vista: "loja",
  categorias: [],
  catalogo: [],
  filtros: { busca: "", categoriaId: null, ordenar: "nome", pagina: 0 },
  paginaProdutos: null,
  carrinho: lerCarrinho(),
  filtroStatus: null,
  paginaPedidos: 0,
  painel: null,
  mesPainel: mesAtual(),
  edicao: null,
  confirmandoProduto: null,
  confirmandoCategoria: null,
  confirmandoCancelamento: null,
  temporizadores: new Map(),
  descontoBusca: null
};

/* -------------------------------------------------------------------------
   Modo demonstração: mesma API, guardada no navegador
   ------------------------------------------------------------------------- */

const demo = (() => {
  let banco = lerBanco();

  function lerBanco() {
    try {
      const bruto = localStorage.getItem(CHAVE_DEMO);
      if (bruto) {
        const salvo = JSON.parse(bruto);
        if (salvo && Array.isArray(salvo.produtos) && Array.isArray(salvo.pedidos)) {
          return salvo;
        }
      }
    } catch (erro) {
      console.warn("Dados de demonstração inválidos, recriando.", erro);
    }
    return semear();
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE_DEMO, JSON.stringify(banco));
    } catch (erro) {
      console.warn("Não foi possível salvar os dados de demonstração.", erro);
    }
  }

  function copiar(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  function moeda(valor) {
    return Math.round(Number(valor) * 100) / 100;
  }

  function proximoId(itens) {
    return itens.reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
  }

  function erro(mensagem) {
    return new Error(mensagem);
  }

  function emMes(mesesAtras, dia) {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth() - mesesAtras, dia, 14, 0, 0).toISOString();
  }

  function semear() {
    const categorias = [
      { id: 1, nome: "Periféricos" },
      { id: 2, nome: "Áudio" },
      { id: 3, nome: "Setup" },
      { id: 4, nome: "Acessórios" }
    ];
    const base = [
      ["Teclado mecânico TKL", "Switches lineares, cabo removível e iluminação branca.", 349.9, 12, 1, 40],
      ["Mouse sem fio", "Sensor de 12.000 DPI, bateria de até 60 dias.", 189.9, 20, 1, 38],
      ["Headset com microfone", "Som fechado, microfone removível e conector USB.", 429.0, 8, 2, 36],
      ["Caixa de som compacta", "Bluetooth, 20 W e bateria de 12 horas.", 259.9, 0, 2, 34],
      ["Monitor 27\" 144 Hz", "Painel IPS, 1 ms e suporte de altura ajustável.", 1499.0, 5, 3, 30],
      ["Suporte para notebook", "Alumínio, altura ajustável e base ventilada.", 129.9, 3, 4, 26],
      ["Mousepad XL", "Borda costurada e superfície de velocidade.", 89.9, 30, 4, 24],
      ["Webcam full HD", "1080p a 30 fps, foco automático e microfone duplo.", 279.9, 2, 4, 20]
    ];
    const produtos = base.map(([nome, descricao, preco, estoque, categoriaId, dias], indice) => ({
      id: indice + 1,
      nome,
      descricao,
      preco,
      estoque,
      ativo: true,
      categoriaId,
      criadoEm: new Date(Date.now() - dias * 86400000).toISOString()
    }));

    const item = (produtoId, quantidade) => {
      const produto = produtos.find((p) => p.id === produtoId);
      return {
        produtoId,
        nomeProduto: produto.nome,
        precoUnitario: produto.preco,
        quantidade,
        subtotal: moeda(produto.preco * quantidade)
      };
    };
    const total = (itens) => moeda(itens.reduce((soma, linha) => soma + linha.subtotal, 0));
    const pedido = (id, clienteNome, clienteEmail, formaPagamento, status, criadoEm, itens) => ({
      id,
      clienteNome,
      clienteEmail,
      formaPagamento,
      status,
      total: total(itens),
      criadoEm,
      itens
    });

    const pedidos = [
      pedido(1, "Marina Alves", "marina.alves@email.com", "PIX", "ENTREGUE", emMes(2, 12), [item(1, 1), item(7, 2)]),
      pedido(2, "Diego Santos", "diego.santos@email.com", "BOLETO", "ENTREGUE", emMes(2, 20), [item(3, 1), item(2, 1)]),
      pedido(3, "Camila Rocha", "camila.rocha@email.com", "CARTAO", "ENVIADO", emMes(1, 9), [item(5, 1), item(6, 1)]),
      pedido(4, "Rafael Lima", "rafael.lima@email.com", "PIX", "PAGO", emMes(0, 5), [item(8, 1), item(7, 1)]),
      pedido(5, "Julia Mendes", "julia.mendes@email.com", "CARTAO", "CANCELADO", emMes(0, 3), [item(4, 1)])
    ];

    const novo = { categorias, produtos, pedidos };
    try {
      localStorage.setItem(CHAVE_DEMO, JSON.stringify(novo));
    } catch (erroArmazenamento) {
      console.warn("Armazenamento indisponível; a demonstração será temporária.", erroArmazenamento);
    }
    return novo;
  }

  function categoriaOuErro(id) {
    const categoria = banco.categorias.find((c) => c.id === Number(id));
    if (!categoria) throw erro("Categoria não encontrada.");
    return categoria;
  }

  function produtoOuErro(id) {
    const produto = banco.produtos.find((p) => p.id === Number(id));
    if (!produto) throw erro("Produto não encontrado.");
    return produto;
  }

  function produtoResponse(produto) {
    const categoria = banco.categorias.find((c) => c.id === produto.categoriaId);
    return {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco,
      estoque: produto.estoque,
      ativo: produto.ativo,
      categoria: categoria ? { id: categoria.id, nome: categoria.nome } : null,
      criadoEm: produto.criadoEm
    };
  }

  function pagina(itens, numero, tamanho) {
    const total = itens.length;
    const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
    const atual = Math.min(Math.max(numero, 0), totalPaginas - 1);
    return {
      content: itens.slice(atual * tamanho, atual * tamanho + tamanho),
      totalElements: total,
      totalPages: totalPaginas,
      number: atual,
      size: tamanho,
      first: atual === 0,
      last: atual === totalPaginas - 1
    };
  }

  function validarProduto(dados) {
    const erros = {};
    if (!dados.nome || !dados.nome.trim()) erros.nome = "O nome do produto é obrigatório.";
    if (dados.descricao && dados.descricao.length > 400) erros.descricao = "A descrição deve ter no máximo 400 caracteres.";
    if (!(Number(dados.preco) > 0)) erros.preco = "O preço deve ser maior que zero.";
    if (!Number.isInteger(Number(dados.estoque)) || Number(dados.estoque) < 0) erros.estoque = "O estoque não pode ser negativo.";
    if (!dados.categoriaId) erros.categoriaId = "A categoria é obrigatória.";
    const lista = Object.values(erros);
    if (lista.length) {
      const falha = erro(lista.join(" "));
      falha.campos = erros;
      throw falha;
    }
  }

  function aplicarDados(produto, dados) {
    produto.nome = dados.nome.trim();
    produto.descricao = dados.descricao && dados.descricao.trim() ? dados.descricao.trim() : null;
    produto.preco = moeda(dados.preco);
    produto.estoque = Number(dados.estoque);
    produto.categoriaId = Number(dados.categoriaId);
  }

  return {
    listarCategorias() {
      return copiar(banco.categorias)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((categoria) => ({ id: categoria.id, nome: categoria.nome }));
    },

    criarCategoria(nome) {
      const limpo = (nome || "").trim();
      if (!limpo) throw erro("O nome da categoria é obrigatório.");
      if (banco.categorias.some((c) => c.nome.toLowerCase() === limpo.toLowerCase())) {
        throw erro("Já existe uma categoria com esse nome.");
      }
      const categoria = { id: proximoId(banco.categorias), nome: limpo };
      banco.categorias.push(categoria);
      salvar();
      return copiar(categoria);
    },

    excluirCategoria(id) {
      const categoria = categoriaOuErro(id);
      if (banco.produtos.some((p) => p.categoriaId === categoria.id)) {
        throw erro("Não é possível excluir uma categoria que ainda tem produtos.");
      }
      banco.categorias = banco.categorias.filter((c) => c.id !== categoria.id);
      salvar();
    },

    listarProdutos(filtros) {
      const termo = (filtros.busca || "").trim().toLowerCase();
      let lista = banco.produtos.filter((produto) => {
        if (termo && !produto.nome.toLowerCase().includes(termo) && !(produto.descricao || "").toLowerCase().includes(termo)) {
          return false;
        }
        if (filtros.categoriaId && produto.categoriaId !== Number(filtros.categoriaId)) return false;
        if (filtros.ativo !== undefined && produto.ativo !== filtros.ativo) return false;
        return true;
      });

      const ordenar = filtros.ordenar || "nome";
      lista = lista.sort((a, b) => {
        if (ordenar === "preco-asc") return a.preco - b.preco || a.nome.localeCompare(b.nome, "pt-BR");
        if (ordenar === "preco-desc") return b.preco - a.preco || a.nome.localeCompare(b.nome, "pt-BR");
        if (ordenar === "novidades") return new Date(b.criadoEm) - new Date(a.criadoEm) || b.id - a.id;
        if (ordenar === "estoque") return a.estoque - b.estoque || a.nome.localeCompare(b.nome, "pt-BR");
        return a.nome.localeCompare(b.nome, "pt-BR");
      });

      const resultado = pagina(lista, filtros.pagina || 0, filtros.tamanho || 12);
      resultado.content = resultado.content.map(produtoResponse);
      return resultado;
    },

    criarProduto(dados) {
      validarProduto(dados);
      categoriaOuErro(dados.categoriaId);
      if (banco.produtos.some((p) => p.nome.toLowerCase() === dados.nome.trim().toLowerCase())) {
        throw erro("Já existe um produto com esse nome.");
      }
      const produto = { id: proximoId(banco.produtos), ativo: dados.ativo !== false, criadoEm: new Date().toISOString() };
      aplicarDados(produto, dados);
      banco.produtos.push(produto);
      salvar();
      return produtoResponse(produto);
    },

    atualizarProduto(id, dados) {
      const produto = produtoOuErro(id);
      validarProduto(dados);
      categoriaOuErro(dados.categoriaId);
      if (banco.produtos.some((p) => p.id !== produto.id && p.nome.toLowerCase() === dados.nome.trim().toLowerCase())) {
        throw erro("Já existe um produto com esse nome.");
      }
      aplicarDados(produto, dados);
      if (dados.ativo !== undefined) produto.ativo = Boolean(dados.ativo);
      salvar();
      return produtoResponse(produto);
    },

    excluirProduto(id) {
      const produto = produtoOuErro(id);
      if (banco.pedidos.some((pedido) => pedido.itens.some((linha) => linha.produtoId === produto.id))) {
        throw erro("Este produto já aparece em pedidos e não pode ser excluído. Desative-o para tirar da loja.");
      }
      banco.produtos = banco.produtos.filter((p) => p.id !== produto.id);
      salvar();
    },

    checkout(dados) {
      if (!dados.itens || !dados.itens.length) throw erro("Inclua pelo menos um produto no pedido.");
      const quantidades = new Map();
      dados.itens.forEach((linha) => {
        quantidades.set(Number(linha.produtoId), (quantidades.get(Number(linha.produtoId)) || 0) + Number(linha.quantidade));
      });
      if ([...quantidades.values()].some((quantidade) => quantidade > 99)) {
        throw erro("A quantidade máxima por produto é 99.");
      }

      const itens = [];
      let total = 0;
      for (const [produtoId, quantidade] of quantidades) {
        const produto = produtoOuErro(produtoId);
        if (!produto.ativo) throw erro(`O produto "${produto.nome}" não está disponível.`);
        if (produto.estoque < quantidade) {
          throw erro(`Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}.`);
        }
      }
      for (const [produtoId, quantidade] of quantidades) {
        const produto = produtoOuErro(produtoId);
        produto.estoque -= quantidade;
        const subtotal = moeda(produto.preco * quantidade);
        total += subtotal;
        itens.push({
          produtoId: produto.id,
          nomeProduto: produto.nome,
          precoUnitario: produto.preco,
          quantidade,
          subtotal
        });
      }

      const pedido = {
        id: proximoId(banco.pedidos),
        clienteNome: dados.clienteNome.trim(),
        clienteEmail: dados.clienteEmail.trim(),
        formaPagamento: dados.formaPagamento,
        status: "PAGO",
        total: moeda(total),
        criadoEm: new Date().toISOString(),
        itens
      };
      banco.pedidos.unshift(pedido);
      salvar();
      return copiar(pedido);
    },

    listarPedidos(filtros) {
      let lista = copiar(banco.pedidos);
      if (filtros.status) lista = lista.filter((pedido) => pedido.status === filtros.status);
      lista.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm) || b.id - a.id);
      return pagina(lista, filtros.pagina || 0, filtros.tamanho || 10);
    },

    alterarStatus(id, status) {
      const pedido = banco.pedidos.find((p) => p.id === Number(id));
      if (!pedido) throw erro("Pedido não encontrado.");
      if (pedido.status === status) return copiar(pedido);

      const permitido = {
        PAGO: ["ENVIADO", "CANCELADO"],
        ENVIADO: ["ENTREGUE"],
        ENTREGUE: [],
        CANCELADO: []
      }[pedido.status].includes(status);
      if (!permitido) {
        if (pedido.status === "ENTREGUE") throw erro("Pedido já entregue não pode ser alterado.");
        if (pedido.status === "CANCELADO") throw erro("Pedido cancelado não pode ser alterado.");
        if (pedido.status === "ENVIADO") throw erro("Um pedido enviado só pode ser marcado como entregue.");
        throw erro(status === "ENTREGUE"
          ? "Marque o pedido como enviado antes de marcá-lo como entregue."
          : "Um pedido pago só pode ser enviado ou cancelado.");
      }

      if (status === "CANCELADO") {
        pedido.itens.forEach((linha) => {
          const produto = banco.produtos.find((p) => p.id === linha.produtoId);
          if (produto) produto.estoque += linha.quantidade;
        });
      }
      pedido.status = status;
      salvar();
      return copiar(pedido);
    },

    painel(mes) {
      const [ano, numeroMes] = mes.split("-").map(Number);
      const inicio = new Date(ano, numeroMes - 1, 1);
      const fim = new Date(ano, numeroMes, 1);
      const doMes = banco.pedidos.filter((pedido) => {
        const criado = new Date(pedido.criadoEm);
        return pedido.status !== "CANCELADO" && criado >= inicio && criado < fim;
      });

      const vendas = doMes.reduce((soma, pedido) => soma + pedido.total, 0);
      const ticketMedio = doMes.length ? vendas / doMes.length : 0;

      const maisVendidos = new Map();
      doMes.forEach((pedido) => {
        pedido.itens.forEach((linha) => {
          const atual = maisVendidos.get(linha.produtoId) || { id: linha.produtoId, nome: linha.nomeProduto, quantidade: 0, total: 0 };
          atual.quantidade += linha.quantidade;
          atual.total = moeda(atual.total + linha.subtotal);
          maisVendidos.set(linha.produtoId, atual);
        });
      });

      const evolucao = [];
      for (let deslocamento = 5; deslocamento >= 0; deslocamento -= 1) {
        const referencia = new Date(ano, numeroMes - 1 - deslocamento, 1);
        const proximo = new Date(ano, numeroMes - deslocamento, 1);
        const pedidosDoMes = banco.pedidos.filter((pedido) => {
          const criado = new Date(pedido.criadoEm);
          return pedido.status !== "CANCELADO" && criado >= referencia && criado < proximo;
        });
        evolucao.push({
          mes: `${referencia.getFullYear()}-${String(referencia.getMonth() + 1).padStart(2, "0")}`,
          total: moeda(pedidosDoMes.reduce((soma, pedido) => soma + pedido.total, 0)),
          pedidos: pedidosDoMes.length
        });
      }

      return copiar({
        mes,
        vendas: moeda(vendas),
        pedidos: doMes.length,
        ticketMedio: moeda(ticketMedio),
        pedidosAbertos: banco.pedidos.filter((pedido) => pedido.status === "PAGO").length,
        estoqueBaixo: banco.produtos
          .filter((produto) => produto.ativo && produto.estoque <= LIMITE_ESTOQUE_BAIXO)
          .sort((a, b) => a.estoque - b.estoque || a.nome.localeCompare(b.nome, "pt-BR"))
          .map((produto) => ({ id: produto.id, nome: produto.nome, estoque: produto.estoque })),
        maisVendidos: [...maisVendidos.values()]
          .sort((a, b) => b.quantidade - a.quantidade || b.total - a.total)
          .slice(0, 5),
        evolucao
      });
    }
  };
})();

/* -------------------------------------------------------------------------
   Comunicação com a API
   ------------------------------------------------------------------------- */

async function requisicao(caminho, opcoes = {}) {
  const { headers, ...resto } = opcoes;
  const resposta = await fetch(caminho, {
    ...resto,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...headers }
  });
  if (!resposta.ok) {
    let mensagem = "Não foi possível concluir a operação.";
    let campos = null;
    try {
      const corpo = await resposta.json();
      if (corpo && corpo.erro) mensagem = corpo.erro;
      campos = corpo ? corpo.campos : null;
    } catch (erroLeitura) {
      mensagem = `Erro ${resposta.status} ao acessar a API.`;
    }
    const falha = new Error(mensagem);
    falha.campos = campos;
    falha.status = resposta.status;
    throw falha;
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}

const dados = {
  async listarCategorias() {
    return estado.modo === "api" ? requisicao("api/categorias") : demo.listarCategorias();
  },
  async criarCategoria(nome) {
    if (estado.modo !== "api") return demo.criarCategoria(nome);
    return requisicao("api/categorias", { method: "POST", body: JSON.stringify({ nome }) });
  },
  async excluirCategoria(id) {
    if (estado.modo !== "api") return demo.excluirCategoria(id);
    return requisicao(`api/categorias/${id}`, { method: "DELETE" });
  },
  async listarProdutos(filtros) {
    if (estado.modo !== "api") return demo.listarProdutos(filtros);
    const parametros = new URLSearchParams();
    if (filtros.busca) parametros.set("busca", filtros.busca);
    if (filtros.categoriaId) parametros.set("categoriaId", filtros.categoriaId);
    if (filtros.ativo !== undefined) parametros.set("ativo", filtros.ativo);
    parametros.set("pagina", filtros.pagina || 0);
    parametros.set("tamanho", filtros.tamanho || 12);
    parametros.set("ordenar", filtros.ordenar || "nome");
    return requisicao(`api/produtos?${parametros.toString()}`);
  },
  async criarProduto(payload) {
    if (estado.modo !== "api") return demo.criarProduto(payload);
    return requisicao("api/produtos", { method: "POST", body: JSON.stringify(payload) });
  },
  async atualizarProduto(id, payload) {
    if (estado.modo !== "api") return demo.atualizarProduto(id, payload);
    return requisicao(`api/produtos/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  async excluirProduto(id) {
    if (estado.modo !== "api") return demo.excluirProduto(id);
    return requisicao(`api/produtos/${id}`, { method: "DELETE" });
  },
  async checkout(payload) {
    if (estado.modo !== "api") return demo.checkout(payload);
    return requisicao("api/pedidos", { method: "POST", body: JSON.stringify(payload) });
  },
  async listarPedidos(filtros) {
    if (estado.modo !== "api") return demo.listarPedidos(filtros);
    const parametros = new URLSearchParams();
    if (filtros.status) parametros.set("status", filtros.status);
    parametros.set("pagina", filtros.pagina || 0);
    parametros.set("tamanho", filtros.tamanho || 10);
    return requisicao(`api/pedidos?${parametros.toString()}`);
  },
  async alterarStatus(id, status) {
    if (estado.modo !== "api") return demo.alterarStatus(id, status);
    return requisicao(`api/pedidos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  async painel(mes) {
    if (estado.modo !== "api") return demo.painel(mes);
    return requisicao(`api/painel?mes=${encodeURIComponent(mes)}`);
  }
};

/* -------------------------------------------------------------------------
   Inicialização e navegação
   ------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  ligarEventos();
  estado.modo = await detectarModo();
  atualizarSelo();
  el.mesPainel.value = estado.mesPainel;
  await carregarCategorias();
  await carregarProdutos();
  atualizarCarrinhoUi();
}

async function detectarModo() {
  try {
    const resposta = await fetch("api/categorias", { headers: { Accept: "application/json" } });
    if (resposta.ok) return "api";
  } catch (erro) {
    return "demo";
  }
  return "demo";
}

function atualizarSelo() {
  if (estado.modo === "api") {
    el.seloModo.textContent = "API Spring Boot";
    el.seloModo.className = "selo api";
  } else {
    el.seloModo.textContent = "Modo demonstração";
    el.seloModo.className = "selo demo";
  }
}

function ligarEventos() {
  document.querySelectorAll(".nav-link").forEach((botao) => {
    botao.addEventListener("click", () => abrirVista(botao.dataset.vista));
  });

  el.busca.addEventListener("input", () => {
    clearTimeout(estado.descontoBusca);
    estado.descontoBusca = setTimeout(() => {
      estado.filtros.busca = el.busca.value;
      estado.filtros.pagina = 0;
      carregarProdutos();
    }, 320);
  });

  el.ordenar.addEventListener("change", () => {
    estado.filtros.ordenar = el.ordenar.value;
    estado.filtros.pagina = 0;
    carregarProdutos();
  });

  el.chipsCategorias.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-categoria]");
    if (!botao) return;
    estado.filtros.categoriaId = botao.dataset.categoria ? Number(botao.dataset.categoria) : null;
    estado.filtros.pagina = 0;
    renderChipsCategorias();
    carregarProdutos();
  });

  el.gradeProdutos.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-adicionar]");
    if (!botao) return;
    const produto = (estado.paginaProdutos ? estado.paginaProdutos.content : []).find((item) => item.id === Number(botao.dataset.adicionar));
    if (produto) adicionarAoCarrinho(produto);
  });

  el.abrirCarrinho.addEventListener("click", () => {
    el.gaveta.hidden ? abrirCarrinho() : fecharCarrinho();
  });
  el.fecharCarrinho.addEventListener("click", fecharCarrinho);
  el.sobreposicao.addEventListener("click", fecharCarrinho);
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !el.gaveta.hidden) fecharCarrinho();
  });

  el.itensCarrinho.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const produtoId = Number(botao.dataset.id);
    if (botao.dataset.acao === "mais") alterarQuantidade(produtoId, 1);
    if (botao.dataset.acao === "menos") alterarQuantidade(produtoId, -1);
    if (botao.dataset.acao === "remover") removerDoCarrinho(produtoId);
  });

  el.irCheckout.addEventListener("click", abrirCheckout);
  el.fecharCheckout.addEventListener("click", () => el.dialogoCheckout.close());
  el.formCheckout.addEventListener("submit", finalizarPedido);
  el.dialogoCheckout.addEventListener("close", prepararCheckout);
  el.continuarComprando.addEventListener("click", () => {
    el.dialogoCheckout.close();
    abrirVista("loja");
  });
  el.verPedidos.addEventListener("click", () => {
    el.dialogoCheckout.close();
    abrirVista("pedidos");
  });

  el.chipsStatus.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-status]");
    if (!botao) return;
    estado.filtroStatus = botao.dataset.status || null;
    estado.paginaPedidos = 0;
    renderChipsStatus();
    carregarPedidos();
  });

  el.listaPedidos.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const id = Number(botao.dataset.id);
    if (botao.dataset.acao === "enviar") alterarStatusPedido(id, "ENVIADO");
    if (botao.dataset.acao === "entregar") alterarStatusPedido(id, "ENTREGUE");
    if (botao.dataset.acao === "cancelar") confirmarCancelamento(id, botao);
  });

  el.mesPainel.addEventListener("change", () => {
    estado.mesPainel = el.mesPainel.value || mesAtual();
    carregarPainel();
  });

  el.formProduto.addEventListener("submit", salvarProduto);
  el.cancelarEdicao.addEventListener("click", cancelarEdicao);
  el.corpoCatalogo.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const id = Number(botao.dataset.id);
    if (botao.dataset.acao === "editar") editarProduto(id);
    if (botao.dataset.acao === "alternar") alternarProduto(id);
    if (botao.dataset.acao === "excluir") excluirProdutoComConfirmacao(id);
  });

  el.formCategoria.addEventListener("submit", criarCategoria);
  el.listaCategorias.addEventListener("click", (evento) => {
    const botao = evento.target.closest("button[data-categoria]");
    if (!botao) return;
    excluirCategoriaComConfirmacao(Number(botao.dataset.categoria), botao);
  });
}

function abrirVista(nome) {
  estado.vista = nome;
  document.querySelectorAll(".nav-link").forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.vista === nome);
  });
  document.querySelectorAll(".vista").forEach((secao) => {
    secao.hidden = secao.id !== `vista-${nome}`;
  });
  if (nome === "pedidos") carregarPedidos();
  if (nome === "gestao") carregarGestao();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -------------------------------------------------------------------------
   Catálogo
   ------------------------------------------------------------------------- */

async function carregarCategorias() {
  try {
    estado.categorias = await dados.listarCategorias();
    if (estado.filtros.categoriaId && !estado.categorias.some((c) => c.id === estado.filtros.categoriaId)) {
      estado.filtros.categoriaId = null;
    }
    renderChipsCategorias();
    renderCategoriasSelect();
    renderListaCategorias();
  } catch (erro) {
    mostrarErro(erro);
  }
}

function renderChipsCategorias() {
  el.chipsCategorias.textContent = "";
  const todas = document.createElement("button");
  todas.type = "button";
  todas.className = `chip${estado.filtros.categoriaId === null ? " ativo" : ""}`;
  todas.dataset.categoria = "";
  todas.textContent = "Todas";
  el.chipsCategorias.append(todas);

  estado.categorias.forEach((categoria) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = `chip${estado.filtros.categoriaId === categoria.id ? " ativo" : ""}`;
    botao.dataset.categoria = String(categoria.id);
    botao.textContent = categoria.nome;
    el.chipsCategorias.append(botao);
  });
}

function renderCategoriasSelect() {
  const anterior = el.produtoCategoria.value;
  el.produtoCategoria.textContent = "";
  const padrao = document.createElement("option");
  padrao.value = "";
  padrao.textContent = "Escolha uma categoria";
  el.produtoCategoria.append(padrao);
  estado.categorias.forEach((categoria) => {
    const opcao = document.createElement("option");
    opcao.value = String(categoria.id);
    opcao.textContent = categoria.nome;
    el.produtoCategoria.append(opcao);
  });
  if (anterior) el.produtoCategoria.value = anterior;
}

async function carregarProdutos() {
  el.avisoLoja.textContent = "Carregando produtos…";
  try {
    const paginaAtual = await dados.listarProdutos({
      busca: estado.filtros.busca,
      categoriaId: estado.filtros.categoriaId,
      ativo: true,
      pagina: estado.filtros.pagina,
      tamanho: TAMANHO_LOJA,
      ordenar: estado.filtros.ordenar
    });
    estado.paginaProdutos = paginaAtual;
    atualizarSnapshots(paginaAtual.content);
    if (paginaAtual.totalElements > 0 && paginaAtual.content.length === 0 && estado.filtros.pagina > 0) {
      estado.filtros.pagina = Math.max(0, paginaAtual.totalPages - 1);
      return carregarProdutos();
    }
    renderProdutos();
    el.avisoLoja.textContent = paginaAtual.totalElements === 0
      ? "Nenhum produto encontrado com esses filtros."
      : `${paginaAtual.totalElements} produto(s) disponíveis.`;
  } catch (erro) {
    el.avisoLoja.textContent = "";
    mostrarErro(erro);
  }
}

function renderProdutos() {
  const paginaAtual = estado.paginaProdutos;
  el.gradeProdutos.textContent = "";
  if (!paginaAtual || paginaAtual.content.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "vazio";
    vazio.textContent = "Nada por aqui. Tente outra busca ou categoria.";
    el.gradeProdutos.append(vazio);
    renderPaginacao(el.paginacaoLoja, null, () => {});
    return;
  }

  paginaAtual.content.forEach((produto) => {
    const cartao = document.createElement("article");
    cartao.className = "produto";

    const topo = document.createElement("div");
    topo.className = "produto-topo";
    const categoria = document.createElement("span");
    categoria.className = "produto-categoria";
    categoria.textContent = produto.categoria ? produto.categoria.nome : "Sem categoria";
    const estoque = document.createElement("span");
    estoque.className = `estoque${produto.estoque === 0 ? " esgotado" : produto.estoque <= LIMITE_ESTOQUE_BAIXO ? " baixo" : ""}`;
    estoque.textContent = produto.estoque === 0
      ? "Esgotado"
      : produto.estoque <= LIMITE_ESTOQUE_BAIXO
        ? `Últimas ${produto.estoque} un.`
        : `${produto.estoque} em estoque`;
    topo.append(categoria, estoque);

    const nome = document.createElement("h3");
    nome.textContent = produto.nome;
    const descricao = document.createElement("p");
    descricao.className = "produto-descricao";
    descricao.textContent = produto.descricao || "Sem descrição.";

    const rodape = document.createElement("div");
    rodape.className = "produto-rodape";
    const preco = document.createElement("span");
    preco.className = "preco";
    preco.textContent = MOEDA.format(produto.preco);
    rodape.append(preco);

    const adicionar = document.createElement("button");
    adicionar.type = "button";
    adicionar.className = "botao-adicionar";
    adicionar.dataset.adicionar = String(produto.id);
    adicionar.textContent = produto.estoque === 0 ? "Esgotado" : "Adicionar ao carrinho";
    adicionar.disabled = produto.estoque === 0;

    cartao.append(topo, nome, descricao, rodape, adicionar);
    el.gradeProdutos.append(cartao);
  });

  renderPaginacao(el.paginacaoLoja, paginaAtual, (numero) => {
    estado.filtros.pagina = numero;
    carregarProdutos();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function renderPaginacao(container, paginaAtual, aoNavegar) {
  container.textContent = "";
  if (!paginaAtual || paginaAtual.totalPages <= 1) return;

  const anterior = document.createElement("button");
  anterior.type = "button";
  anterior.className = "pagina-botao";
  anterior.textContent = "←";
  anterior.disabled = paginaAtual.first;
  anterior.setAttribute("aria-label", "Página anterior");
  anterior.addEventListener("click", () => aoNavegar(paginaAtual.number - 1));
  container.append(anterior);

  const inicio = Math.max(0, paginaAtual.number - 2);
  const fim = Math.min(paginaAtual.totalPages, inicio + 5);
  for (let numero = inicio; numero < fim; numero += 1) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = `pagina-botao${numero === paginaAtual.number ? " ativo" : ""}`;
    botao.textContent = String(numero + 1);
    botao.setAttribute("aria-label", `Página ${numero + 1}`);
    botao.addEventListener("click", () => aoNavegar(numero));
    container.append(botao);
  }

  const proxima = document.createElement("button");
  proxima.type = "button";
  proxima.className = "pagina-botao";
  proxima.textContent = "→";
  proxima.disabled = paginaAtual.last;
  proxima.setAttribute("aria-label", "Próxima página");
  proxima.addEventListener("click", () => aoNavegar(paginaAtual.number + 1));
  container.append(proxima);
}

/* -------------------------------------------------------------------------
   Carrinho
   ------------------------------------------------------------------------- */

function lerCarrinho() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "[]");
    if (!Array.isArray(bruto)) return [];
    return bruto
      .filter((linha) => linha && Number(linha.produtoId) > 0 && Number(linha.quantidade) > 0)
      .map((linha) => ({
        produtoId: Number(linha.produtoId),
        nome: String(linha.nome || "Produto"),
        preco: Number(linha.preco) || 0,
        quantidade: Math.min(Number(linha.quantidade), 99),
        estoque: Number(linha.estoque) || 0
      }));
  } catch (erro) {
    return [];
  }
}

function salvarCarrinho() {
  try {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(estado.carrinho));
  } catch (erro) {
    console.warn("Não foi possível guardar o carrinho.", erro);
  }
}

function atualizarSnapshots(produtos) {
  produtos.forEach((produto) => {
    const linha = estado.carrinho.find((item) => item.produtoId === produto.id);
    if (linha) {
      linha.nome = produto.nome;
      linha.preco = produto.preco;
      linha.estoque = produto.estoque;
      if (linha.quantidade > produto.estoque && produto.estoque > 0) linha.quantidade = produto.estoque;
    }
  });
  salvarCarrinho();
}

function atualizarCarrinhoUi() {
  const total = estado.carrinho.reduce((soma, linha) => soma + linha.quantidade, 0);
  el.carrinhoContagem.textContent = String(total);
  el.carrinhoContagem.setAttribute("aria-label", `${total} item(ns) no carrinho`);
  renderItensCarrinho();
}

function adicionarAoCarrinho(produto) {
  const limite = Math.min(produto.estoque, 99);
  const linha = estado.carrinho.find((item) => item.produtoId === produto.id);
  const quantidadeAtual = linha ? linha.quantidade : 0;
  if (quantidadeAtual >= limite) {
    mostrarToast(`Limite de ${limite} unidade(s) para este produto.`, true);
    return;
  }
  if (linha) {
    linha.quantidade += 1;
    linha.nome = produto.nome;
    linha.preco = produto.preco;
    linha.estoque = produto.estoque;
  } else {
    estado.carrinho.push({
      produtoId: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: 1,
      estoque: produto.estoque
    });
  }
  salvarCarrinho();
  atualizarCarrinhoUi();
  abrirCarrinho();
  mostrarToast("Produto adicionado ao carrinho.");
}

function alterarQuantidade(produtoId, delta) {
  const linha = estado.carrinho.find((item) => item.produtoId === produtoId);
  if (!linha) return;
  const limite = Math.min(linha.estoque || 99, 99);
  const nova = linha.quantidade + delta;
  if (nova > limite) {
    mostrarToast(`Limite de ${limite} unidade(s) para este produto.`, true);
    return;
  }
  if (nova < 1) {
    removerDoCarrinho(produtoId);
    return;
  }
  linha.quantidade = nova;
  salvarCarrinho();
  atualizarCarrinhoUi();
}

function removerDoCarrinho(produtoId) {
  estado.carrinho = estado.carrinho.filter((linha) => linha.produtoId !== produtoId);
  salvarCarrinho();
  atualizarCarrinhoUi();
}

function renderItensCarrinho() {
  el.itensCarrinho.textContent = "";
  if (estado.carrinho.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "texto-vazio";
    vazio.textContent = "Seu carrinho está vazio. Escolha um produto no catálogo.";
    el.itensCarrinho.append(vazio);
  }

  estado.carrinho.forEach((linha) => {
    const bloco = document.createElement("div");
    bloco.className = "item-carrinho";

    const info = document.createElement("div");
    const nome = document.createElement("p");
    nome.className = "item-nome";
    nome.textContent = linha.nome;
    const preco = document.createElement("p");
    preco.className = "item-preco";
    preco.textContent = `${MOEDA.format(linha.preco)} cada`;
    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "remover-item";
    remover.dataset.acao = "remover";
    remover.dataset.id = String(linha.produtoId);
    remover.textContent = "Remover";
    info.append(nome, preco, remover);

    const controles = document.createElement("div");
    controles.className = "item-controles";
    const menos = document.createElement("button");
    menos.type = "button";
    menos.dataset.acao = "menos";
    menos.dataset.id = String(linha.produtoId);
    menos.setAttribute("aria-label", `Diminuir quantidade de ${linha.nome}`);
    menos.textContent = "−";
    const quantidade = document.createElement("span");
    quantidade.className = "quantidade";
    quantidade.textContent = String(linha.quantidade);
    const mais = document.createElement("button");
    mais.type = "button";
    mais.dataset.acao = "mais";
    mais.dataset.id = String(linha.produtoId);
    mais.setAttribute("aria-label", `Aumentar quantidade de ${linha.nome}`);
    mais.textContent = "+";
    controles.append(menos, quantidade, mais);

    bloco.append(info, controles);
    el.itensCarrinho.append(bloco);
  });

  const subtotal = estado.carrinho.reduce((soma, linha) => soma + linha.preco * linha.quantidade, 0);
  el.subtotalCarrinho.textContent = MOEDA.format(subtotal);
  el.irCheckout.disabled = estado.carrinho.length === 0;
}

function abrirCarrinho() {
  el.sobreposicao.hidden = false;
  el.gaveta.hidden = false;
  el.abrirCarrinho.setAttribute("aria-expanded", "true");
  el.fecharCarrinho.focus();
}

function fecharCarrinho(devolverFoco = true) {
  el.sobreposicao.hidden = true;
  el.gaveta.hidden = true;
  el.abrirCarrinho.setAttribute("aria-expanded", "false");
  if (devolverFoco) el.abrirCarrinho.focus();
}

/* -------------------------------------------------------------------------
   Checkout
   ------------------------------------------------------------------------- */

function abrirCheckout() {
  if (estado.carrinho.length === 0) {
    mostrarToast("Seu carrinho está vazio.", true);
    return;
  }
  prepararCheckout();
  fecharCarrinho(false);
  el.dialogoCheckout.showModal();
  setTimeout(() => el.clienteNome.focus(), 40);
}

function prepararCheckout() {
  el.checkoutCampos.hidden = false;
  el.checkoutSucesso.hidden = true;
  el.tituloCheckout.textContent = "Finalizar compra";
  el.erroCheckout.hidden = true;
  el.erroCheckout.textContent = "";
  el.formCheckout.reset();
  preencherResumoCheckout();
}

function preencherResumoCheckout() {
  el.resumoCheckout.textContent = "";
  let total = 0;
  estado.carrinho.forEach((linha) => {
    const valor = linha.preco * linha.quantidade;
    total += valor;
    const item = document.createElement("div");
    item.className = "linha";
    const nome = document.createElement("span");
    nome.textContent = `${linha.nome} × ${linha.quantidade}`;
    const preco = document.createElement("span");
    preco.textContent = MOEDA.format(valor);
    item.append(nome, preco);
    el.resumoCheckout.append(item);
  });
  const linhaTotal = document.createElement("div");
  linhaTotal.className = "linha total";
  const rotulo = document.createElement("span");
  rotulo.textContent = "Total";
  const valorTotal = document.createElement("span");
  valorTotal.textContent = MOEDA.format(total);
  linhaTotal.append(rotulo, valorTotal);
  el.resumoCheckout.append(linhaTotal);
}

async function finalizarPedido(evento) {
  evento.preventDefault();
  if (estado.carrinho.length === 0) return;

  const nome = el.clienteNome.value.trim();
  const email = el.clienteEmail.value.trim();
  const forma = el.formCheckout.querySelector('input[name="pagamento"]:checked').value;
  const problemas = [];
  if (nome.length < 3) problemas.push("Informe seu nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problemas.push("Informe um e-mail válido.");
  if (problemas.length) {
    mostrarErroCheckout(problemas.join(" "));
    return;
  }

  el.confirmarPedido.disabled = true;
  el.confirmarPedido.textContent = "Enviando…";
  try {
    const pedido = await dados.checkout({
      clienteNome: nome,
      clienteEmail: email,
      formaPagamento: forma,
      itens: estado.carrinho.map((linha) => ({ produtoId: linha.produtoId, quantidade: linha.quantidade }))
    });
    estado.carrinho = [];
    salvarCarrinho();
    atualizarCarrinhoUi();
    fecharCarrinho(false);
    el.checkoutCampos.hidden = true;
    el.checkoutSucesso.hidden = false;
    el.tituloCheckout.textContent = "Compra concluída";
    el.numeroPedido.textContent = `Pedido #${pedido.id}`;
    el.resumoPedido.textContent = `${MOEDA.format(pedido.total)} · ${FORMAS[pedido.formaPagamento] || pedido.formaPagamento} · ${pedido.itens.length} produto(s)`;
    mostrarToast("Pedido registrado com sucesso.");
    await carregarProdutos();
  } catch (erro) {
    mostrarErroCheckout(mensagemDoErro(erro));
  } finally {
    el.confirmarPedido.disabled = false;
    el.confirmarPedido.textContent = "Confirmar pedido";
  }
}

function mostrarErroCheckout(mensagem) {
  el.erroCheckout.textContent = mensagem;
  el.erroCheckout.hidden = false;
}

/* -------------------------------------------------------------------------
   Pedidos
   ------------------------------------------------------------------------- */

function renderChipsStatus() {
  el.chipsStatus.textContent = "";
  const opcoes = [[null, "Todos"], ...Object.entries(STATUS).map(([chave, info]) => [chave, info.rotulo])];
  opcoes.forEach(([chave, rotulo]) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = `chip${estado.filtroStatus === chave ? " ativo" : ""}`;
    botao.dataset.status = chave || "";
    botao.textContent = rotulo;
    el.chipsStatus.append(botao);
  });
}

async function carregarPedidos() {
  if (!el.chipsStatus.children.length) renderChipsStatus();
  el.listaPedidos.textContent = "";
  const carregando = document.createElement("p");
  carregando.className = "aviso";
  carregando.textContent = "Carregando pedidos…";
  el.listaPedidos.append(carregando);

  try {
    const paginaAtual = await dados.listarPedidos({
      status: estado.filtroStatus,
      pagina: estado.paginaPedidos,
      tamanho: TAMANHO_PEDIDOS
    });
    if (paginaAtual.totalElements > 0 && paginaAtual.content.length === 0 && estado.paginaPedidos > 0) {
      estado.paginaPedidos = Math.max(0, paginaAtual.totalPages - 1);
      return carregarPedidos();
    }
    renderPedidos(paginaAtual);
  } catch (erro) {
    el.listaPedidos.textContent = "";
    mostrarErro(erro);
  }
}

function renderPedidos(paginaAtual) {
  el.listaPedidos.textContent = "";
  if (paginaAtual.content.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "vazio";
    vazio.textContent = "Nenhum pedido com esse filtro.";
    el.listaPedidos.append(vazio);
    renderPaginacao(el.paginacaoPedidos, null, () => {});
    return;
  }

  paginaAtual.content.forEach((pedido) => {
    const cartao = document.createElement("article");
    cartao.className = "pedido";

    const cabecalho = document.createElement("div");
    cabecalho.className = "pedido-cabecalho";
    const identificacao = document.createElement("div");
    const numero = document.createElement("p");
    numero.className = "pedido-id";
    numero.textContent = `Pedido #${pedido.id} · ${formatarData(pedido.criadoEm)}`;
    const cliente = document.createElement("p");
    cliente.className = "pedido-cliente";
    cliente.textContent = pedido.clienteNome;
    const meta = document.createElement("p");
    meta.className = "pedido-meta";
    meta.textContent = `${pedido.clienteEmail} · ${FORMAS[pedido.formaPagamento] || pedido.formaPagamento}`;
    identificacao.append(numero, cliente, meta);

    const info = STATUS[pedido.status] || { rotulo: pedido.status, classe: "" };
    const status = document.createElement("span");
    status.className = `status ${info.classe}`;
    status.textContent = info.rotulo;
    cabecalho.append(identificacao, status);

    const itens = document.createElement("ul");
    itens.className = "pedido-itens";
    pedido.itens.forEach((linha) => {
      const item = document.createElement("li");
      const nome = document.createElement("span");
      nome.textContent = `${linha.nomeProduto} × ${linha.quantidade}`;
      const valor = document.createElement("span");
      valor.textContent = MOEDA.format(linha.subtotal);
      item.append(nome, valor);
      itens.append(item);
    });

    const rodape = document.createElement("div");
    rodape.className = "pedido-rodape";
    const total = document.createElement("span");
    total.className = "pedido-total";
    total.textContent = MOEDA.format(pedido.total);

    const acoes = document.createElement("div");
    acoes.className = "pedido-acoes";
    if (pedido.status === "PAGO") {
      acoes.append(botaoAcao("enviar", pedido.id, "Marcar como enviado"));
      const cancelar = botaoAcao("cancelar", pedido.id, estado.confirmandoCancelamento === pedido.id ? "Confirmar cancelamento" : "Cancelar pedido");
      cancelar.classList.add("botao-perigo");
      if (estado.confirmandoCancelamento === pedido.id) cancelar.classList.add("confirmando");
      acoes.append(cancelar);
    }
    if (pedido.status === "ENVIADO") {
      acoes.append(botaoAcao("entregar", pedido.id, "Marcar como entregue"));
    }
    rodape.append(total, acoes);

    cartao.append(cabecalho, itens, rodape);
    el.listaPedidos.append(cartao);
  });

  renderPaginacao(el.paginacaoPedidos, paginaAtual, (numero) => {
    estado.paginaPedidos = numero;
    carregarPedidos();
  });
}

function botaoAcao(acao, id, texto) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao-acao";
  botao.dataset.acao = acao;
  botao.dataset.id = String(id);
  botao.textContent = texto;
  return botao;
}

async function alterarStatusPedido(id, status) {
  try {
    await dados.alterarStatus(id, status);
    estado.confirmandoCancelamento = null;
    mostrarToast(`Pedido #${id} atualizado para ${STATUS[status].rotulo.toLowerCase()}.`);
  } catch (erro) {
    mostrarErro(erro);
  }
  await carregarPedidos();
  await carregarProdutos();
  if (estado.painel) await carregarPainel();
}

function confirmarCancelamento(id) {
  if (estado.confirmandoCancelamento === id) {
    alterarStatusPedido(id, "CANCELADO");
    return;
  }
  estado.confirmandoCancelamento = id;
  carregarPedidos();
  agendarConfirmacao(`cancelamento-${id}`, () => {
    estado.confirmandoCancelamento = null;
    if (estado.vista === "pedidos") carregarPedidos();
  });
}

function agendarConfirmacao(chave, acao) {
  clearTimeout(estado.temporizadores.get(chave));
  estado.temporizadores.set(chave, setTimeout(acao, 8000));
}

/* -------------------------------------------------------------------------
   Gestão
   ------------------------------------------------------------------------- */

async function carregarGestao() {
  el.mesPainel.value = estado.mesPainel;
  await Promise.all([carregarPainel(), carregarCatalogo()]);
  if (!estado.categorias.length) await carregarCategorias();
  renderListaCategorias();
}

async function carregarPainel() {
  el.cardsPainel.textContent = "";
  try {
    const painel = await dados.painel(estado.mesPainel);
    estado.painel = painel;
    renderPainel(painel);
  } catch (erro) {
    mostrarErro(erro);
  }
}

function renderPainel(painel) {
  el.cardsPainel.textContent = "";
  const cards = [
    ["Vendas no mês", MOEDA.format(painel.vendas), true],
    ["Pedidos pagos", String(painel.pedidos), false],
    ["Ticket médio", MOEDA.format(painel.ticketMedio), false],
    ["Pedidos abertos", String(painel.pedidosAbertos), false]
  ];
  cards.forEach(([rotulo, valor, destaque]) => {
    const card = document.createElement("div");
    card.className = `card-painel${destaque ? " destaque" : ""}`;
    const titulo = document.createElement("span");
    titulo.textContent = rotulo;
    const numero = document.createElement("strong");
    numero.textContent = valor;
    card.append(titulo, numero);
    el.cardsPainel.append(card);
  });

  el.listaEstoque.textContent = "";
  if (painel.estoqueBaixo.length === 0) {
    el.listaEstoque.append(itemTexto("Nenhum produto em estoque crítico."));
  } else {
    painel.estoqueBaixo.forEach((produto) => {
      const linha = document.createElement("li");
      const nome = document.createElement("span");
      nome.textContent = produto.nome;
      const valor = document.createElement("span");
      valor.className = `valor${produto.estoque === 0 ? " alerta" : ""}`;
      valor.textContent = `${produto.estoque} un.`;
      linha.append(nome, valor);
      el.listaEstoque.append(linha);
    });
  }

  el.listaMaisVendidos.textContent = "";
  if (painel.maisVendidos.length === 0) {
    el.listaMaisVendidos.append(itemTexto("Nenhuma venda neste mês."));
  } else {
    painel.maisVendidos.forEach((produto) => {
      const linha = document.createElement("li");
      const nome = document.createElement("span");
      nome.textContent = produto.nome;
      const valor = document.createElement("span");
      valor.className = "valor";
      valor.textContent = `${produto.quantidade} un. · ${MOEDA.format(produto.total)}`;
      linha.append(nome, valor);
      el.listaMaisVendidos.append(linha);
    });
  }

  el.evolucaoPainel.textContent = "";
  const maior = Math.max(...painel.evolucao.map((mes) => mes.total), 1);
  painel.evolucao.forEach((mes) => {
    const coluna = document.createElement("div");
    coluna.className = `evolucao-mes${mes.total === 0 ? " zero" : ""}`;
    const barra = document.createElement("div");
    barra.className = "evolucao-barra";
    barra.style.height = `${Math.max(4, Math.round((mes.total / maior) * 104))}px`;
    barra.title = `${mes.mes}: ${MOEDA.format(mes.total)} em ${mes.pedidos} pedido(s)`;
    const [ano, numero] = mes.mes.split("-");
    const rotulo = document.createElement("span");
    rotulo.textContent = `${MESES[Number(numero) - 1]}/${ano.slice(2)}`;
    const total = document.createElement("span");
    total.textContent = mes.total > 0 ? MOEDA.format(mes.total) : "—";
    coluna.append(barra, rotulo, total);
    el.evolucaoPainel.append(coluna);
  });
}

function itemTexto(texto) {
  const linha = document.createElement("li");
  linha.className = "texto-vazio";
  linha.textContent = texto;
  return linha;
}

async function carregarCatalogo() {
  try {
    const paginaAtual = await dados.listarProdutos({ pagina: 0, tamanho: 48, ordenar: "nome" });
    estado.catalogo = paginaAtual.content;
    renderCatalogo();
  } catch (erro) {
    mostrarErro(erro);
  }
}

function renderCatalogo() {
  el.corpoCatalogo.textContent = "";
  el.totalCatalogo.textContent = `${estado.catalogo.length} produto(s)`;

  estado.catalogo.forEach((produto) => {
    const linha = document.createElement("tr");

    const nome = document.createElement("td");
    const titulo = document.createElement("span");
    titulo.className = "nome-produto";
    titulo.textContent = produto.nome;
    nome.append(titulo);
    if (!produto.ativo) {
      const tag = document.createElement("span");
      tag.className = "tag-off";
      tag.textContent = "Fora da loja";
      const espaco = document.createElement("span");
      espaco.textContent = " ";
      nome.append(espaco, tag);
    }

    const preco = document.createElement("td");
    preco.textContent = MOEDA.format(produto.preco);
    const estoque = document.createElement("td");
    estoque.textContent = `${produto.estoque} un.`;

    const acoes = document.createElement("td");
    acoes.className = "acoes";
    acoes.append(
      botaoTabela("editar", produto.id, "Editar"),
      botaoTabela("alternar", produto.id, produto.ativo ? "Desativar" : "Ativar")
    );
    const excluir = botaoTabela("excluir", produto.id, estado.confirmandoProduto === produto.id ? "Confirmar" : "Excluir");
    excluir.classList.add("botao-perigo");
    if (estado.confirmandoProduto === produto.id) excluir.classList.add("confirmando");
    acoes.append(excluir);

    linha.append(nome, preco, estoque, acoes);
    el.corpoCatalogo.append(linha);
  });
}

function botaoTabela(acao, id, texto) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao-acao";
  botao.dataset.acao = acao;
  botao.dataset.id = String(id);
  botao.textContent = texto;
  return botao;
}

async function salvarProduto(evento) {
  evento.preventDefault();
  el.erroProduto.hidden = true;
  const id = el.produtoId.value ? Number(el.produtoId.value) : null;
  const payload = {
    nome: el.produtoNome.value.trim(),
    descricao: el.produtoDescricao.value.trim(),
    preco: Number(el.produtoPreco.value),
    estoque: Number(el.produtoEstoque.value),
    categoriaId: el.produtoCategoria.value ? Number(el.produtoCategoria.value) : null,
    ativo: el.produtoAtivo.checked
  };

  if (!payload.nome) return exibirErroProduto("Informe o nome do produto.");
  if (!(payload.preco > 0)) return exibirErroProduto("Informe um preço maior que zero.");
  if (!Number.isInteger(payload.estoque) || payload.estoque < 0) return exibirErroProduto("Informe um estoque válido.");
  if (!payload.categoriaId) return exibirErroProduto("Escolha uma categoria.");

  el.salvarProduto.disabled = true;
  try {
    if (id) {
      await dados.atualizarProduto(id, payload);
      mostrarToast("Produto atualizado.");
    } else {
      await dados.criarProduto(payload);
      mostrarToast("Produto cadastrado.");
    }
    limparFormularioProduto();
    await Promise.all([carregarCatalogo(), carregarProdutos(), carregarPainel()]);
  } catch (erro) {
    exibirErroProduto(mensagemDoErro(erro));
  } finally {
    el.salvarProduto.disabled = false;
  }
}

function exibirErroProduto(mensagem) {
  el.erroProduto.textContent = mensagem;
  el.erroProduto.hidden = false;
}

function editarProduto(id) {
  const produto = estado.catalogo.find((item) => item.id === id);
  if (!produto) return;
  estado.edicao = id;
  el.produtoId.value = String(produto.id);
  el.produtoNome.value = produto.nome;
  el.produtoDescricao.value = produto.descricao || "";
  el.produtoPreco.value = String(produto.preco);
  el.produtoEstoque.value = String(produto.estoque);
  el.produtoCategoria.value = produto.categoria ? String(produto.categoria.id) : "";
  el.produtoAtivo.checked = produto.ativo;
  el.tituloFormProduto.textContent = "Editar produto";
  el.salvarProduto.textContent = "Salvar alterações";
  el.cancelarEdicao.hidden = false;
  el.erroProduto.hidden = true;
  el.formProduto.scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelarEdicao() {
  limparFormularioProduto();
}

function limparFormularioProduto() {
  estado.edicao = null;
  el.formProduto.reset();
  el.produtoId.value = "";
  el.produtoAtivo.checked = true;
  el.tituloFormProduto.textContent = "Novo produto";
  el.salvarProduto.textContent = "Cadastrar produto";
  el.cancelarEdicao.hidden = true;
  el.erroProduto.hidden = true;
}

async function alternarProduto(id) {
  const produto = estado.catalogo.find((item) => item.id === id);
  if (!produto) return;
  try {
    await dados.atualizarProduto(id, {
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco,
      estoque: produto.estoque,
      categoriaId: produto.categoria ? produto.categoria.id : null,
      ativo: !produto.ativo
    });
    mostrarToast(produto.ativo ? "Produto retirado da loja." : "Produto disponível na loja.");
    await Promise.all([carregarCatalogo(), carregarProdutos(), carregarPainel()]);
  } catch (erro) {
    mostrarErro(erro);
  }
}

function excluirProdutoComConfirmacao(id) {
  if (estado.confirmandoProduto !== id) {
    estado.confirmandoProduto = id;
    renderCatalogo();
    agendarConfirmacao(`produto-${id}`, () => {
      estado.confirmandoProduto = null;
      if (estado.vista === "gestao") renderCatalogo();
    });
    return;
  }

  estado.confirmandoProduto = null;
  dados.excluirProduto(id)
    .then(async () => {
      mostrarToast("Produto excluído.");
      if (estado.edicao === id) limparFormularioProduto();
      await Promise.all([carregarCatalogo(), carregarProdutos(), carregarPainel()]);
    })
    .catch(mostrarErro);
}

function renderListaCategorias() {
  el.listaCategorias.textContent = "";
  el.totalCategorias.textContent = `${estado.categorias.length} categoria(s)`;

  estado.categorias.forEach((categoria) => {
    const linha = document.createElement("li");
    const nome = document.createElement("span");
    nome.textContent = categoria.nome;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.categoria = String(categoria.id);
    botao.textContent = estado.confirmandoCategoria === categoria.id ? "Confirmar" : "×";
    botao.setAttribute("aria-label", `Excluir categoria ${categoria.nome}`);
    botao.title = "Excluir categoria";
    if (estado.confirmandoCategoria === categoria.id) {
      botao.classList.add("confirmando");
      botao.textContent = "Confirmar";
    }
    linha.append(nome, botao);
    el.listaCategorias.append(linha);
  });
}

async function criarCategoria(evento) {
  evento.preventDefault();
  el.erroCategoria.hidden = true;
  const nome = el.nomeCategoria.value.trim();
  if (!nome) {
    el.erroCategoria.textContent = "Informe o nome da categoria.";
    el.erroCategoria.hidden = false;
    return;
  }
  try {
    await dados.criarCategoria(nome);
    el.formCategoria.reset();
    mostrarToast("Categoria criada.");
    await carregarCategorias();
    await carregarCatalogo();
  } catch (erro) {
    el.erroCategoria.textContent = mensagemDoErro(erro);
    el.erroCategoria.hidden = false;
  }
}

function excluirCategoriaComConfirmacao(id) {
  if (estado.confirmandoCategoria !== id) {
    estado.confirmandoCategoria = id;
    renderListaCategorias();
    agendarConfirmacao(`categoria-${id}`, () => {
      estado.confirmandoCategoria = null;
      if (estado.vista === "gestao") renderListaCategorias();
    });
    return;
  }

  estado.confirmandoCategoria = null;
  dados.excluirCategoria(id)
    .then(async () => {
      mostrarToast("Categoria excluída.");
      await carregarCategorias();
      await carregarProdutos();
    })
    .catch((erro) => {
      renderListaCategorias();
      mostrarErro(erro);
    });
}

/* -------------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------------- */

function mesAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function formatarData(iso) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : FORMATO_DATA.format(data);
}

function mensagemDoErro(erro) {
  if (erro && erro.campos) {
    const mensagens = [...new Set(Object.values(erro.campos).filter(Boolean))];
    if (mensagens.length) return mensagens.join(" ");
  }
  return erro && erro.message ? erro.message : "Não foi possível concluir a operação.";
}

let temporizadorToast = null;

function mostrarToast(mensagem, ehErro = false) {
  clearTimeout(temporizadorToast);
  el.toast.textContent = mensagem;
  el.toast.className = `toast${ehErro ? " erro" : ""}`;
  el.toast.hidden = false;
  temporizadorToast = setTimeout(() => {
    el.toast.hidden = true;
  }, 3600);
}

function mostrarErro(erro) {
  mostrarToast(mensagemDoErro(erro), true);
}
