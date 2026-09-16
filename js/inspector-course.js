/* =============================================================================
   INSPETOR: CURSO — painel "Visao geral"
   =============================================================================

   Opcoes que valem para o pacote inteiro: cor da marca, logo, versao do SCORM,
   comportamento do player (barra de progresso, navegacao livre, exigir
   aprovacao), qualidade da rasterizacao de PDF, resumo e o atalho para
   reabrir um pacote existente.
   ========================================================================== */

"use strict";

// Painel 'Visao geral': cor, logo, versao SCORM, comportamento, resumo e importacao.
function renderInspCourse(host) {
  $("inspTitle").textContent = "Curso";
  var qp = quizPage();
  var h = "";
  h += '<div class="fgrp"><label class="lbl" for="fPrimary">Cor da marca</label>' +
    '<div class="row"><input type="color" id="fPrimary" value="' + esc(S.primary) + '" style="width:44px;height:34px;padding:2px;border:1px solid var(--line);border-radius:var(--r);background:#fff">' +
    '<input class="inp" id="fPrimaryHex" value="' + esc(S.primary) + '" spellcheck="false"></div>' +
    '<p class="hint">Usada no cabeçalho e nos botões do curso.</p></div>';

  h += '<div class="fgrp"><label class="lbl">Logo</label>';
  if (S.logo) h += '<img class="logo-prev" src="' + S.logo + '" alt="">';
  h += '<div class="row"><button class="btn btn-sm" id="btnLogo">' + (S.logo ? "Trocar" : "Enviar") + "</button>";
  if (S.logo) h += '<button class="btn btn-sm btn-danger" id="btnLogoDel">Remover</button>';
  h += "</div></div>";

  h += '<div class="fgrp"><label class="lbl" for="fScorm">Versão do SCORM</label>' +
    '<select class="inp" id="fScorm">' +
    '<option value="2004"' + (S.scorm === "2004" ? " selected" : "") + ">SCORM 2004 4ª edição</option>" +
    '<option value="1.2"' + (S.scorm === "1.2" ? " selected" : "") + ">SCORM 1.2</option>" +
    "</select>" +
    '<p class="hint">Na dúvida use 1.2: é aceito por praticamente todo LMS. O 2004 registra progresso parcial.</p></div>';

  h += '<div class="sect"><h3 class="sect-h">Comportamento</h3>';
  h += '<label class="chk"><input type="checkbox" id="fProg"' + (S.showProgress ? " checked" : "") +
    '><span>Mostrar barra de progresso</span></label>';
  h += '<label class="chk"><input type="checkbox" id="fFree"' + (S.freeNav ? " checked" : "") +
    '><span>Navegação livre<br><span class="hint" style="margin:0">Se desmarcado, o aluno não passa do quiz sem responder.</span></span></label>';
  h += '<label class="chk"><input type="checkbox" id="fReq"' + (S.requireQuizPass ? " checked" : "") +
    '><span>Exigir aprovação no quiz para concluir<br><span class="hint" style="margin:0">Define o que o LMS registra como “concluído”.</span></span></label>';
  h += "</div>";

  h += '<div class="sect"><h3 class="sect-h">Importação de PDF</h3>';
  h += '<div class="fgrp"><label class="lbl" for="fPw">Largura dos slides</label>' +
    '<select class="inp" id="fPw">' +
    ["1280", "1600", "2000"].map(function (w) {
      return '<option value="' + w + '"' + (String(S.pdfWidth) === w ? " selected" : "") + ">" + w + " px</option>";
    }).join("") + "</select></div>";
  h += '<div class="fgrp"><label class="lbl" for="fPf">Formato</label>' +
    '<select class="inp" id="fPf">' +
    '<option value="jpeg"' + (S.pdfFormat === "jpeg" ? " selected" : "") + ">JPEG (arquivo menor)</option>" +
    '<option value="png"' + (S.pdfFormat === "png" ? " selected" : "") + ">PNG (texto mais nítido)</option>" +
    "</select></div></div>";

  h += '<div class="sect"><h3 class="sect-h">Resumo</h3>' +
    '<dl style="margin:0">' +
    '<div class="kv"><dt>Slides</dt><dd>' + S.pages.filter(function (p) { return p.type === "slide"; }).length + "</dd></div>" +
    '<div class="kv"><dt>Vídeos</dt><dd>' + S.pages.filter(function (p) { return p.type === "video"; }).length + "</dd></div>" +
    '<div class="kv"><dt>Questões</dt><dd>' + (qp ? qp.questions.length : 0) + "</dd></div>" +
    '<div class="kv"><dt>Nota mínima</dt><dd>' + (qp ? qp.config.passingScore + "%" : "—") + "</dd></div>" +
    "</dl></div>";

  h += '<div class="sect"><button class="btn btn-sm" id="btnImportZip" style="width:100%">Abrir pacote SCORM existente…</button>' +
    '<p class="hint">Aproveita slides, quiz e cores de um .zip já pronto.</p></div>';

  host.innerHTML = h;

  bind("fPrimary", "input", function (e) { S.primary = e.target.value; $("fPrimaryHex").value = e.target.value; });
  bind("fPrimaryHex", "change", function (e) {
    var v = e.target.value.trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) { S.primary = v; $("fPrimary").value = v; }
    else { e.target.value = S.primary; }
  });
  bind("btnLogo", "click", function () { $("fileLogo").click(); });
  bind("btnLogoDel", "click", function () { S.logo = null; renderInsp(); });
  bind("fScorm", "change", function (e) { S.scorm = e.target.value; renderTrack(); });
  bind("fProg", "change", function (e) { S.showProgress = e.target.checked; });
  bind("fFree", "change", function (e) { S.freeNav = e.target.checked; });
  bind("fReq", "change", function (e) { S.requireQuizPass = e.target.checked; });
  bind("fPw", "change", function (e) { S.pdfWidth = parseInt(e.target.value, 10); });
  bind("fPf", "change", function (e) { S.pdfFormat = e.target.value; });
  bind("btnImportZip", "click", function () { $("fileZip").click(); });
}
