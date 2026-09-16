/* =============================================================================
   INSPETOR: QUIZ — regras e editor de questoes
   =============================================================================

   O maior painel da ferramenta. Ordem dos campos e deliberada: a nota minima
   vem primeiro por ser o campo mais mexido.

   Restricoes que a interface impoe (e que validate() confere de novo antes de
   exportar): 1 quiz por curso, no minimo 1 questao, no minimo 2 alternativas
   por questao e exatamente 1 correta.
   ========================================================================== */

"use strict";

// Painel do quiz: nota minima, regras e o editor de questoes e alternativas.
function renderInspQuiz(host, p) {
  $("inspTitle").textContent = "Quiz";
  var c = p.config;
  // Texto derivado da nota minima. Fica numa funcao porque e atualizado a cada
  // tecla, sem redesenhar o painel (redesenhar tiraria o foco do campo).
  function textoNota(pct) {
    var total = p.questions.length;
    var exige = Math.ceil(total * pct / 100);
    return "Com " + total + (total === 1 ? " questão" : " questões") + ", " + pct +
      "% exige " + exige + (exige === 1 ? " acerto" : " acertos") + ".";
  }

  // A nota minima vem primeiro: e o campo mais mexido do painel.
  var h = '<div class="fgrp"><label class="lbl" for="fPass">Nota mínima de aprovação</label>' +
    '<div class="row">' +
    '<input class="inp" id="fPass" type="number" inputmode="numeric" min="0" max="100" step="1"' +
    ' value="' + c.passingScore + '" style="max-width:96px;font-weight:600;font-size:15px">' +
    '<span class="hint" style="margin:0">% de acertos</span></div>' +
    '<p class="hint" id="fPassHint">' + esc(textoNota(c.passingScore)) + "</p></div>";

  h += '<div class="fgrp"><label class="lbl" for="fTitle">Título</label>' +
    '<input class="inp" id="fTitle" value="' + esc(p.title) + '"></div>';

  h += '<div class="fgrp"><label class="lbl" for="fSub">Subtítulo</label>' +
    '<input class="inp" id="fSub" value="' + esc(c.subtitle || "") +
    '" placeholder="' + esc(quizSubAuto(p)) + '">' +
    '<p class="hint">A linha cinza abaixo do título. Vazio = usa o texto automático ' +
    "que aparece em cinza aqui no campo.</p></div>";

  h += '<div class="fgrp"><label class="lbl" for="fIntro">Texto de abertura</label>' +
    '<textarea class="inp" id="fIntro" placeholder="Opcional. Instruções antes das questões.">' + esc(c.intro) + "</textarea></div>";

  h += '<div class="sect"><h3 class="sect-h">Regras</h3>';
  h += '<label class="chk"><input type="checkbox" id="qRetry"' + (c.allowRetry ? " checked" : "") + '><span>Permitir nova tentativa se reprovar</span></label>';
  h += '<label class="chk"><input type="checkbox" id="qBlock"' + (c.blockWhenFailed ? " checked" : "") + '><span>Bloquear avanço enquanto reprovado</span></label>';
  h += '<label class="chk"><input type="checkbox" id="qRand"' + (c.randomize ? " checked" : "") + '><span>Sortear a ordem das questões</span></label>';
  h += '<label class="chk"><input type="checkbox" id="qShow"' + (c.showAnswers ? " checked" : "") + '><span>Mostrar revisão das respostas no fim</span></label>';
  h += '<label class="chk"><input type="checkbox" id="qCorr"' + (c.showCorrect ? " checked" : "") + '><span>Revelar a alternativa correta</span></label>';
  h += "</div>";

  h += '<div class="sect"><h3 class="sect-h">Questões (' + p.questions.length + ")</h3>";
  p.questions.forEach(function (q, k) {
    var nCorrect = q.choices.filter(function (x) { return x.correct; }).length;
    var bad = !q.text.trim() || nCorrect !== 1 || q.choices.some(function (x) { return !x.text.trim(); });
    h += '<div class="qed closed" data-q="' + q.id + '">' +
      '<div class="qed-h"><span class="n">' + (k + 1) + '</span><span class="t">' +
      (esc(q.text.slice(0, 46)) || "(sem enunciado)") + "</span>" +
      '<span class="badge ' + (bad ? "err" : "ok") + '">' + (bad ? "!" : "ok") + "</span></div>";
    h += '<div class="qed-b">';
    h += '<div class="fgrp"><label class="lbl">Enunciado</label>' +
      '<textarea class="inp qTxt" data-q="' + q.id + '">' + esc(q.text) + "</textarea></div>";
    h += '<div class="fgrp"><label class="lbl">Alternativas <span class="hint" style="margin:0">— marque a correta</span></label>';
    q.choices.forEach(function (ch) {
      h += '<div class="ch-row">' +
        '<input type="radio" name="corr_' + q.id + '" class="chCorr" data-q="' + q.id + '" data-c="' + ch.id + '"' +
        (ch.correct ? " checked" : "") + ' title="Marcar como correta">' +
        '<textarea class="inp chTxt" data-q="' + q.id + '" data-c="' + ch.id + '">' + esc(ch.text) + "</textarea>" +
        '<button class="btn btn-sm btn-ghost chDel" data-q="' + q.id + '" data-c="' + ch.id + '" title="Remover alternativa">×</button>' +
        "</div>";
    });
    h += '<button class="btn btn-sm chAdd" data-q="' + q.id + '">+ Alternativa</button></div>';
    h += '<div class="fgrp"><label class="lbl">Feedback ao acertar</label>' +
      '<textarea class="inp fbOk" data-q="' + q.id + '" placeholder="Opcional">' + esc(q.feedbackOk) + "</textarea></div>";
    h += '<div class="fgrp"><label class="lbl">Feedback ao errar</label>' +
      '<textarea class="inp fbNo" data-q="' + q.id + '" placeholder="Opcional">' + esc(q.feedbackNo) + "</textarea></div>";
    h += '<button class="btn btn-sm btn-danger qDel" data-q="' + q.id + '">Excluir questão</button>';
    h += "</div></div>";
  });
  h += '<button class="btn btn-sm" id="qAdd" style="width:100%">+ Questão</button></div>';
  h += moveBlock(p);
  host.innerHTML = h;

  bind("fTitle", "input", function (e) { p.title = e.target.value; renderTrack(); renderStage(); });
  // Atualiza a cada tecla. Nao chama renderInsp() de proposito: recriar o
  // painel no meio da digitacao tiraria o foco e fecharia as questoes abertas.
  bind("fPass", "input", function (e) {
    var v = parseInt(e.target.value, 10);
    if (isNaN(v)) return;                          // campo vazio: deixa digitar
    p.config.passingScore = Math.max(0, Math.min(100, v));
    var hint = $("fPassHint");
    if (hint) hint.textContent = textoNota(p.config.passingScore);
    renderStage();
    renderTrack();
  });
  // Ao sair do campo, normaliza o que foi digitado (vazio, fora de 0-100, "abc").
  bind("fPass", "blur", function (e) {
    var v = parseInt(e.target.value, 10);
    if (isNaN(v)) v = p.config.passingScore;
    p.config.passingScore = Math.max(0, Math.min(100, v));
    e.target.value = p.config.passingScore;
    var hint = $("fPassHint");
    if (hint) hint.textContent = textoNota(p.config.passingScore);
    renderStage();
    renderTrack();
  });
  // renderStage() apenas: renderInsp() recriaria o campo e tiraria o foco.
  bind("fSub", "input", function (e) { p.config.subtitle = e.target.value; renderStage(); });
  bind("fIntro", "input", function (e) { p.config.intro = e.target.value; });
  [["qRetry", "allowRetry"], ["qBlock", "blockWhenFailed"], ["qRand", "randomize"],
   ["qShow", "showAnswers"], ["qCorr", "showCorrect"]].forEach(function (pair) {
    bind(pair[0], "change", function (e) { p.config[pair[1]] = e.target.checked; renderStage(); });
  });

  // Localiza uma questao do quiz pelo id (usada pelos eventos do editor).
  function findQ(qid) { for (var i = 0; i < p.questions.length; i++) if (p.questions[i].id === qid) return p.questions[i]; return null; }

  Array.prototype.forEach.call(host.querySelectorAll(".qed-h"), function (el) {
    el.addEventListener("click", function () { el.parentNode.classList.toggle("closed"); });
  });
  Array.prototype.forEach.call(host.querySelectorAll(".qTxt"), function (el) {
    el.addEventListener("input", function () { findQ(el.dataset.q).text = el.value; renderStage(); });
  });
  Array.prototype.forEach.call(host.querySelectorAll(".chTxt"), function (el) {
    el.addEventListener("input", function () {
      var q = findQ(el.dataset.q);
      q.choices.forEach(function (c) { if (c.id === el.dataset.c) c.text = el.value; });
      renderStage();
    });
  });
  Array.prototype.forEach.call(host.querySelectorAll(".chCorr"), function (el) {
    el.addEventListener("change", function () {
      var q = findQ(el.dataset.q);
      q.choices.forEach(function (c) { c.correct = (c.id === el.dataset.c); });
      renderStage();
    });
  });
  Array.prototype.forEach.call(host.querySelectorAll(".chDel"), function (el) {
    el.addEventListener("click", function () {
      var q = findQ(el.dataset.q);
      if (q.choices.length <= 2) { toast("Uma questão precisa de pelo menos 2 alternativas."); return; }
      q.choices = q.choices.filter(function (c) { return c.id !== el.dataset.c; });
      if (!q.choices.some(function (c) { return c.correct; })) q.choices[0].correct = true;
      renderAll();
    });
  });
  Array.prototype.forEach.call(host.querySelectorAll(".chAdd"), function (el) {
    el.addEventListener("click", function () {
      findQ(el.dataset.q).choices.push({ id: uid(), text: "", correct: false });
      renderAll();
    });
  });
  Array.prototype.forEach.call(host.querySelectorAll(".fbOk"), function (el) {
    el.addEventListener("input", function () { findQ(el.dataset.q).feedbackOk = el.value; });
  });
  Array.prototype.forEach.call(host.querySelectorAll(".fbNo"), function (el) {
    el.addEventListener("input", function () { findQ(el.dataset.q).feedbackNo = el.value; });
  });
  Array.prototype.forEach.call(host.querySelectorAll(".qDel"), function (el) {
    el.addEventListener("click", function () {
      if (p.questions.length <= 1) { toast("O quiz precisa de pelo menos 1 questão."); return; }
      if (!confirm("Excluir esta questão?")) return;
      p.questions = p.questions.filter(function (q) { return q.id !== el.dataset.q; });
      renderAll();
    });
  });
  bind("qAdd", "click", function () { p.questions.push(newQuestion()); renderAll(); });
  wireMove(p);
}
