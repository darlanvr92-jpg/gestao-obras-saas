// Central Administrativa da PLATAFORMA (separada das empresas clientes).
// Mostra apenas dados cadastrais e de uso — nunca dados financeiros ou documentos privados dos clientes.
import { sb, esc, ic, moeda, data, dataHora, tag, toast, msgErro, q, tabela, formulario, ir, docFmt } from "../core.js?v=202611081100";

const ST = { teste: ["Em avaliação", "lar"], ativa: ["Ativo", "verde"], inadimplente: ["Pagamento pendente", "verm"], bloqueada: ["Suspenso", "verm"], cancelada: ["Encerrado", "cinza"] };
const COB = { approved: ["Aprovado", "verde"], rejected: ["Recusado", "verm"], cancelled: ["Cancelado", "cinza"], pending: ["Pendente", "lar"], in_process: ["Em análise", "lar"], processed: ["Processado", "verde"] };
const MODS = ["obras", "compras", "notas", "estoque", "epi", "diario", "financeiro", "relatorios", "fornecedores", "equipe"];
const NM = { obras: "Obras", compras: "Ordens de compra", notas: "Notas fiscais", estoque: "Estoque", epi: "EPI", diario: "Diário de obra", financeiro: "Financeiro", relatorios: "Relatórios", fornecedores: "Fornecedores", equipe: "Equipe" };
const NR = { relatorios_basicos: "Relatórios básicos", relatorios_avancados: "Relatórios avançados", relatorios_gerenciais: "Relatórios gerenciais", permissoes_avancadas: "Permissões individuais por usuário", admin_extra: "Recursos administrativos adicionais" };
const RECS = ["relatorios_basicos", "relatorios_avancados", "relatorios_gerenciais", "permissoes_avancadas", "admin_extra"];

export async function render(el, [aba = "indicadores"]) {
  const abas = [["indicadores", "Visão geral"], ["empresas", "Clientes"], ["planos", "Planos"], ["cobrancas", "Faturamento"], ["config", "Políticas comerciais"]];
  el.innerHTML = `<div class="cab-pagina"><div><h1>Central Administrativa</h1><p>Acompanhamento de clientes, contratos, faturamento e utilização da plataforma.</p></div></div>
    <div class="abas">${abas.map(([k, l]) => `<button data-aba="${k}" class="${k === aba ? "on" : ""}">${l}</button>`).join("")}</div><div id="pl"></div>`;
  el.querySelectorAll("[data-aba]").forEach((b) => b.onclick = () => ir("plataforma/" + b.dataset.aba));
  try { await ABAS[aba](el.querySelector("#pl"), () => render(el, [aba])); } catch (e) { el.querySelector("#pl").innerHTML = `<div class="card"><div class="vazio verm">${esc(msgErro(e))}</div></div>`; }
}

const ABAS = {
  async indicadores(c) {
    const [i, pls] = await Promise.all([q(sb.rpc("plat_indicadores")), q(sb.from("planos").select("id,nome"))]);
    const nomePlano = (id) => pls.find((p) => p.id === id)?.nome || id;
    const k = (ic_, cor, t, v) => `<div class="card kpi"><div class="ic t-${cor}">${ic(ic_)}</div><div><small>${t}</small><b>${v}</b></div></div>`;
    c.innerHTML = `<div class="grade g4">${k("obras", "azul", "Clientes cadastrados", i.empresas)}${k("ok", "verde", "Contratos ativos", i.ativas)}${k("relogio", "lar", "Em avaliação gratuita", i.teste)}${k("alerta", "verm", "Pendentes / suspensos", `${i.inadimplentes} / ${i.bloqueadas}`)}
      ${k("dinheiro", "verde", "Receita mensal recorrente (MRR)", moeda(i.receita_mensal))}${k("equipe", "roxo", "Usuários licenciados", i.usuarios)}${k("obras", "azul", "Obras gerenciadas", i.obras)}${k("usuario", "azul", "Acessos nos últimos 7 dias", i.acessos_7d)}</div>
      <div class="card" style="margin-top:16px"><div class="ct"><h3>Distribuição de clientes por plano</h3></div><div class="cc">${Object.entries(i.por_plano || {}).map(([p, n]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)"><span>Plano ${esc(nomePlano(p))}</span><b>${n} ${n === 1 ? "cliente" : "clientes"}</b></div>`).join("") || "Nenhum cliente ainda."}</div></div>`;
  },
  async empresas(c, rec) {
    const [l, planos] = await Promise.all([q(sb.rpc("plat_empresas")), q(sb.from("planos").select("id,nome").order("ordem"))]);
    c.innerHTML = `<div class="card">${tabela([
      { l: "Cliente", pri: true, f: (r) => `<b>${esc(r.nome)}</b><div class="mu peq">${esc(docFmt(r.cnpj) || "")} ${esc(r.email || "")}</div>` }, { l: "Plano", f: (r) => esc(planos.find((p) => p.id === r.plano_id)?.nome || r.plano_id) },
      { l: "Situação", f: (r) => tag(...(ST[r.status_efetivo] || [r.status_efetivo, "cinza"])) + (r.bloqueio_manual ? ' <span class="tag verm">suspensão manual</span>' : "") },
      { l: "Avaliação até", f: (r) => data(r.teste_ate) || "-" }, { l: "Usuários", num: true, k: "usuarios" }, { l: "Obras", num: true, k: "obras" },
      { l: "Contrato", f: (r) => esc({ teste: "Avaliação", pendente: "Aguardando pagamento", ativa: "Ativo", pausada: "Pausado", cancelada: "Encerrado", inadimplente: "Pagamento pendente" }[r.assinatura_status] || "-") + (r.proximo_vencimento ? `<div class="mu peq">próx.: ${data(r.proximo_vencimento)}</div>` : "") },
      { l: "Último acesso", f: (r) => dataHora(r.ultimo_acesso) || "-" }, { l: "Cliente desde", f: (r) => data(r.criado_em) }], l, { clique: true, vazio: "Nenhum cliente cadastrado." })}</div>`;
    c.querySelectorAll("tr.clic").forEach((tr, i) => tr.onclick = () => {
      const e = l[i];
      formulario({ titulo: `Contrato do cliente: ${e.nome}`, valores: { ...e, bloqueio: e.bloqueio_manual }, campos: [
        { k: "plano_id", l: "Plano", t: "select", op: planos.map((p) => [p.id, p.nome]), req: true, vazio: false },
        { k: "teste_ate", l: "Avaliação gratuita até", t: "date" },
        { k: "limite_obras", l: "Limite de obras (contrato)", t: "num", min: 0, ajuda: "Vazio = usa o limite do plano" }, { k: "limite_usuarios", l: "Limite de usuários (contrato)", t: "num", min: 0 },
        { k: "bloqueio", l: "Suspender o acesso deste cliente", t: "check", s2: true }, { k: "motivo_bloqueio", l: "Motivo exibido ao cliente", s2: true, ph: "Ex.: pagamento em atraso" }],
        salvar: async (v) => { await q(sb.rpc("plat_atualizar_empresa", { p_id: e.id, p_plano: v.plano_id, p_bloqueio: v.bloqueio, p_motivo: v.motivo_bloqueio, p_limite_obras: v.limite_obras, p_limite_usuarios: v.limite_usuarios, p_teste_ate: v.teste_ate })); toast("Contrato atualizado.", "ok"); rec(); } });
    });
  },
  async planos(c, rec) {
    const l = await q(sb.from("planos").select("*").order("ordem"));
    c.innerHTML = `<div class="card">${tabela([{ l: "Plano", pri: true, f: (r) => `<b>${esc(r.nome)}</b>` }, { l: "Preço mensal", num: true, f: (r) => moeda(r.preco_mensal) },
      { l: "Obras ativas", num: true, f: (r) => r.max_obras ?? "Sob contrato" }, { l: "Usuários", num: true, f: (r) => r.max_usuarios ?? "Sob contrato" }, { l: "Módulos", f: (r) => `<span class="peq">${esc(r.modulos.map((m) => NM[m] || m).join(", "))}</span>` }, { l: "Ativo", f: (r) => tag(r.ativo ? "Sim" : "Não", r.ativo ? "verde" : "cinza") }], l, { clique: true })}</div>
      <p class="mu peq">Selecione um plano para alterar preço, limites e módulos incluídos. Os limites são aplicados automaticamente a todos os clientes do plano.</p>`;
    c.querySelectorAll("tr.clic").forEach((tr, i) => tr.onclick = () => {
      const p = l[i];
      const campos = [{ k: "nome", l: "Nome", req: true }, { k: "preco_mensal", l: "Preço mensal (R$)", t: "money", req: true, min: 0 }, { k: "descricao", l: "Descrição", s2: true },
        { k: "max_obras", l: "Máx. obras ativas (vazio = contrato)", t: "num", min: 0 }, { k: "max_usuarios", l: "Máx. usuários (vazio = contrato)", t: "num", min: 0 },
        { t: "secao", l: "Módulos incluídos" }, ...MODS.map((m) => ({ k: "m_" + m, l: NM[m], t: "check" })), { t: "secao", l: "Recursos adicionais" }, ...RECS.map((r) => ({ k: "r_" + r, l: NR[r], t: "check" })), { k: "ativo", l: "Plano disponível para contratação", t: "check", s2: true }];
      const val = { ...p, ...Object.fromEntries(MODS.map((m) => ["m_" + m, p.modulos.includes(m)])), ...Object.fromEntries(RECS.map((r) => ["r_" + r, p.recursos.includes(r)])) };
      formulario({ titulo: `Plano ${p.nome}`, campos, valores: val, tamanho: "larga", salvar: async (v) => {
        await q(sb.from("planos").update({ nome: v.nome, preco_mensal: v.preco_mensal, descricao: v.descricao, max_obras: v.max_obras, max_usuarios: v.max_usuarios, ativo: v.ativo,
          modulos: MODS.filter((m) => v["m_" + m]), recursos: RECS.filter((r) => v["r_" + r]) }).eq("id", p.id));
        toast("Plano atualizado.", "ok"); rec(); } });
    });
  },
  async cobrancas(c) {
    const l = await q(sb.rpc("plat_cobrancas"));
    c.innerHTML = `<div class="card">${tabela([{ l: "Data", f: (r) => dataHora(r.data) }, { l: "Cliente", pri: true, k: "empresa" }, { l: "Valor", num: true, f: (r) => moeda(r.valor) }, { l: "Situação", f: (r) => tag(...(COB[r.status] || [r.status || "-", "cinza"])) }, { l: "Detalhe", k: "status_detalhe" }], l, { vazio: "Nenhum pagamento registrado até o momento." })}</div>`;
  },
  async config(c, rec) {
    const l = await q(sb.from("plataforma_config").select("*"));
    const g = (k) => l.find((x) => x.chave === k)?.valor;
    c.innerHTML = `<div class="card"><div class="ct"><h3>Políticas comerciais</h3><button class="bt peq" id="cf">${ic("editar")}Editar</button></div><div class="cc"><div class="info-lista">
      <div><small>Período de avaliação gratuita</small><span>${g("dias_teste")} dias</span></div><div><small>Prazo de tolerância para pagamentos em atraso</small><span>${g("dias_tolerancia_inadimplencia")} dia(s)</span></div>
      <div><small>Administradores autorizados</small><span>${esc((g("emails_admin_plataforma") || []).join(", "))}</span></div></div></div></div>`;
    c.querySelector("#cf").onclick = () => formulario({ titulo: "Políticas comerciais", valores: { t: g("dias_teste"), d: g("dias_tolerancia_inadimplencia") },
      campos: [{ k: "t", l: "Dias de avaliação gratuita para novos clientes", t: "num", req: true, min: 0 }, { k: "d", l: "Dias de tolerância após vencimento sem pagamento", t: "num", req: true, min: 0 }],
      salvar: async (v) => { await q(sb.from("plataforma_config").upsert([{ chave: "dias_teste", valor: Math.floor(v.t) }, { chave: "dias_tolerancia_inadimplencia", valor: Math.floor(v.d) }])); toast("Políticas atualizadas.", "ok"); rec(); } });
  },
};
