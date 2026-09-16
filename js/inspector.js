/* =============================================================================
   INSPETOR — coluna da direita: roteador e blocos compartilhados
   =============================================================================

   renderInsp() e so o roteador; cada tipo de pagina tem sua propria funcao
   num arquivo proprio (inspector-course.js, -slide.js, -video.js, -quiz.js).

   O padrao e sempre o mesmo: montar o HTML numa string, jogar no innerHTML e
   depois ligar os eventos, que alteram o objeto da pagina e chamam
   renderAll() de novo.

   A excecao proposital: campos de texto chamam renderStage()/renderTrack(),
   nunca renderInsp() — recriar o painel no meio da digitacao tiraria o foco
   do campo.

   Aqui ficam as duas pecas usadas por todos os painels: bind() e o bloco
   Subir/Descer/Excluir (moveBlock + wireMove).
   ========================================================================== */

"use strict";

// Roteador do inspetor: decide entre painel do curso, de slide, de video ou de quiz.
function renderInsp() {
  var host = $("insp");
  if (S.inspMode === "course" || !selPage()) { renderInspCourse(host); return; }
  var p = selPage();
  if (p.type === "slide") renderInspSlide(host, p);
  else if (p.type === "video") renderInspVideo(host, p);
  else renderInspQuiz(host, p);
}

// Atalho para addEventListener que ignora silenciosamente elemento inexistente.
function bind(id, ev, fn) { var e = $(id); if (e) e.addEventListener(ev, fn); }

// Devolve o HTML dos botoes Subir / Descer / Excluir de uma pagina.
function moveBlock(p) {
  var i = pageIndex(p.id);
  return '<div class="row" style="margin-top:4px">' +
    '<button class="btn btn-sm" id="mvUp"' + (i === 0 ? " disabled" : "") + ">↑ Subir</button>" +
    '<button class="btn btn-sm" id="mvDn"' + (i >= S.pages.length - 1 ? " disabled" : "") + ">↓ Descer</button>" +
    '<span style="flex:1"></span>' +
    '<button class="btn btn-sm btn-danger" id="pgDel">Excluir</button></div>';
}
// Liga os eventos dos botoes gerados por moveBlock().
function wireMove(p) {
  bind("mvUp", "click", function () {
    var i = pageIndex(p.id); if (i <= 0) return;
    S.pages.splice(i - 1, 0, S.pages.splice(i, 1)[0]); renderAll();
  });
  bind("mvDn", "click", function () {
    var i = pageIndex(p.id); if (i >= S.pages.length - 1) return;
    S.pages.splice(i + 1, 0, S.pages.splice(i, 1)[0]); renderAll();
  });
  bind("pgDel", "click", function () {
    if (!confirm("Excluir esta página?")) return;
    var i = pageIndex(p.id);
    S.pages.splice(i, 1);
    S.sel = S.pages.length ? S.pages[Math.min(i, S.pages.length - 1)].id : null;
    if (!S.pages.length) S.inspMode = "course";
    renderAll();
  });
}
