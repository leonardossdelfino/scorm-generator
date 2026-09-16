/* =============================================================================
   PAINEL DO PALCO — coluna central
   =============================================================================

   Previa da pagina selecionada. Slide vira <img>, video vira <video> (MP4) ou
   <iframe> (link), quiz vira uma lista somente-leitura com a alternativa
   correta destacada em verde. Quando a trilha esta vazia, mostra a tela
   inicial com os botoes de importacao.

   E previa, nao player: quem reproduz o curso de verdade e o player.js escrito
   no pacote (bloco #tpl-player do HTML).
   ========================================================================== */

"use strict";

// Desenha a previa central conforme o tipo da pagina (slide, video ou quiz).
function renderStage() {
  var host = $("stage"), p = selPage();

  if (!S.pages.length) {
    host.innerHTML = '<div class="stage"><div class="stage-empty">' +
      "<h2>Comece pelos slides</h2>" +
      "<p>Importe o PDF do seu deck e cada página vira um slide do curso. " +
      "Depois adicione um vídeo e um quiz com nota mínima.</p>" +
      '<button class="btn btn-primary" id="emptyPdf">Importar PDF</button> ' +
      '<button class="btn" id="emptyZip">Abrir SCORM existente</button>' +
      "</div></div>";
    $("emptyPdf").addEventListener("click", function () { $("filePdf").click(); });
    $("emptyZip").addEventListener("click", function () { $("fileZip").click(); });
    $("stagePos").textContent = "—";
    return;
  }

  if (!p) { host.innerHTML = ""; $("stagePos").textContent = "—"; return; }

  var i = pageIndex(p.id);
  $("stagePos").textContent = (i + 1) + " / " + S.pages.length;
  $("btnPrev").disabled = i === 0;
  $("btnNext").disabled = i >= S.pages.length - 1;

  if (p.type === "slide") {
    host.innerHTML = '<div class="stage"><img class="stage-slide" src="' + p.data + '" alt=""></div>';
  } else if (p.type === "video") {
    if (p.mode === "file") {
      if (p.file) {
        host.innerHTML = '<div class="stage"><video class="vid-frame" src="' + videoObjUrl(p) +
          '" controls preload="metadata"></video></div>';
      } else {
        host.innerHTML = '<div class="stage"><div class="vid-none">' +
          (p.pending ? "Anexe o arquivo de vídeo novamente no inspetor" : "Envie um MP4 no inspetor") +
          "</div></div>";
      }
    } else {
      var emb = toEmbed(p.url);
      var local = location.protocol === "file:";
      host.innerHTML = '<div class="stage">' + (emb
        ? '<iframe class="vid-frame" src="' + esc(emb) +
          '" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Prévia do vídeo"></iframe>' +
          (local ? '<div class="stage-pad" style="padding:14px 20px"><p class="hint" style="margin:0">' +
            "Rodando em <span style=\"font-family:var(--mono)\">file://</span>: o YouTube recusa a prévia com erro 153 porque não recebe " +
            "o cabeçalho <span style=\"font-family:var(--mono)\">Referer</span>. Não é problema do pacote — no LMS, servido por HTTPS, funciona. " +
            "Para conferir aqui, sirva a pasta com <span style=\"font-family:var(--mono)\">python3 -m http.server</span>." +
            "</p></div>" : "")
        : '<div class="vid-none">Cole a URL do vídeo no inspetor</div>') + "</div>";
    }
  } else {
    var h = '<div class="stage"><div class="stage-pad">';
    h += '<h2 class="qz-h">' + esc(p.title || "Avaliação") + "</h2>";
    var sub = (p.config.subtitle || "").trim() || quizSubAuto(p);
    h += '<p class="qz-sub">' + esc(sub) + "</p>";
    p.questions.forEach(function (q, k) {
      h += '<div class="qz-q"><div class="qz-qh"><span class="qz-qn">' + (k + 1) + ".</span>" +
        '<span class="qz-qt">' + (esc(q.text) || '<span style="color:var(--muted)">(sem enunciado)</span>') + "</span></div>";
      q.choices.forEach(function (c) {
        h += '<div class="qz-ch' + (c.correct ? " ok" : "") + '"><span class="qz-dot"></span><span>' +
          (esc(c.text) || '<span style="color:var(--muted)">(vazia)</span>') + "</span></div>";
      });
      h += "</div>";
    });
    h += "</div></div>";
    host.innerHTML = h;
  }
}
