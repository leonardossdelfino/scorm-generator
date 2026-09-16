/* =============================================================================
   INSPETOR: SLIDE
   =============================================================================

   Titulo da pagina, troca da imagem e o bloco mover/excluir. A troca reusa o
   mesmo <input type=file> da importacao de imagens: replaceTarget (em
   importers.js) e o que diz a importImages() para substituir em vez de criar
   pagina nova.
   ========================================================================== */

"use strict";

// Painel de um slide: titulo, substituir imagem, mover e excluir.
function renderInspSlide(host, p) {
  var i = pageIndex(p.id);
  $("inspTitle").textContent = "Slide " + (i + 1);
  var h = '<div class="fgrp"><label class="lbl" for="fTitle">Título da página</label>' +
    '<input class="inp" id="fTitle" value="' + esc(p.title) + '" placeholder="Slide ' + (i + 1) + '">' +
    '<p class="hint">Aparece no cabeçalho do curso. Pode ficar vazio.</p></div>';
  h += '<div class="fgrp"><label class="lbl">Imagem</label>' +
    '<button class="btn btn-sm" id="btnReplace">Substituir imagem…</button>' +
    '<p class="hint">' + esc(p.ext.toUpperCase()) + " · " + Math.round(p.data.length * 0.75 / 1024) + " KB</p></div>";
  h += moveBlock(p);
  host.innerHTML = h;
  bind("fTitle", "input", function (e) { p.title = e.target.value; renderTrack(); });
  bind("btnReplace", "click", function () {
    replaceTarget = p.id;
    $("fileImg").click();
  });
  wireMove(p);
}
