/* =============================================================================
   PAINEL DA TRILHA — coluna da esquerda
   =============================================================================

   Lista as paginas na ordem em que o aluno vai ver. Cada linha mostra
   miniatura, numero e tipo. Reordenar e por arrastar-e-soltar (dragId guarda
   quem esta sendo arrastado) ou pelos botoes Subir/Descer do inspetor
   (moveBlock, em inspector.js). Tambem atualiza os contadores da barra
   superior.
   ========================================================================== */

"use strict";

var dragId = null;

// Desenha a coluna da esquerda, liga o arrastar-e-soltar e atualiza os contadores do topo.
function renderTrack() {
  var host = $("trackList");
  if (!S.pages.length) {
    host.innerHTML = '<p style="padding:14px 6px;color:var(--muted);font-size:12.5px">' +
      "Nenhuma página ainda. Comece importando um PDF ou imagens.</p>";
  } else {
    var h = "";
    S.pages.forEach(function (p, i) {
      var thumb, kind;
      if (p.type === "slide") {
        thumb = '<img src="' + p.data + '" alt="">';
        kind = "slide";
      } else if (p.type === "video") {
        thumb = "\u25B6"; kind = p.mode === "file" ? "vídeo · mp4" : "vídeo · link";
      } else {
        thumb = "?"; kind = p.questions.length + "q · " + p.config.passingScore + "%";
      }
      var name = p.title || (p.type === "slide" ? "Slide " + (i + 1) : p.type);
      h += '<div class="trk' + (p.id === S.sel ? " sel" : "") + '" data-id="' + p.id + '" draggable="true" tabindex="0">' +
        '<span class="trk-n">' + (i + 1) + "</span>" +
        '<span class="trk-main"><span class="trk-thumb">' + thumb + "</span>" +
        '<span class="trk-txt"><span class="trk-name">' + esc(name) + "</span>" +
        '<span class="trk-kind">' + esc(kind) + "</span></span></span></div>";
    });
    host.innerHTML = h;
  }

  Array.prototype.forEach.call(host.querySelectorAll(".trk"), function (el) {
    var id = el.dataset.id;
    el.addEventListener("click", function () { select(id); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(id); }
    });
    el.addEventListener("dragstart", function (e) {
      dragId = id; el.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", id); } catch (x) {}
    });
    el.addEventListener("dragend", function () { dragId = null; renderTrack(); });
    el.addEventListener("dragover", function (e) {
      if (!dragId || dragId === id) return;
      e.preventDefault(); el.classList.add("drag-over");
    });
    el.addEventListener("dragleave", function () { el.classList.remove("drag-over"); });
    el.addEventListener("drop", function (e) {
      e.preventDefault(); el.classList.remove("drag-over");
      if (!dragId || dragId === id) return;
      var from = pageIndex(dragId), to = pageIndex(id);
      if (from < 0 || to < 0) return;
      var moved = S.pages.splice(from, 1)[0];
      S.pages.splice(to, 0, moved);
      dragId = null;
      renderAll();
    });
  });

  $("trackCount").textContent = S.pages.length ? S.pages.length : "";
  var ov = $("btnOverview");
  if (ov) ov.classList.toggle("active", S.inspMode === "course");
  var nq = 0, qp = quizPage();
  if (qp) nq = qp.questions.length;
  $("statPill").textContent = S.pages.length + " páginas" + (qp ? " · " + nq + " questões" : "");
  $("verBadge").textContent = "V1";
}

// Seleciona uma pagina, muda o inspetor para modo pagina e volta o palco ao topo.
function select(id) {
  var changed = S.sel !== id;
  S.sel = id;
  S.inspMode = "page";
  renderAll();
  if (changed) { var w = $("stageWrap"); if (w) w.scrollTop = 0; }
  var el = document.querySelector('.trk[data-id="' + id + '"]');
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
}
