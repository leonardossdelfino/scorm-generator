/* =============================================================================
   APP — render geral, ligacao dos eventos e boot
   =============================================================================

   Ultimo arquivo da lista de <script> do HTML: quando ele roda, todas as
   funcoes dos demais modulos ja estao definidas.

   renderAll() e o ponto unico de atualizacao da interface — qualquer mudanca
   em S termina numa chamada dele.

   init() liga todos os eventos. A funcao hook() cuida dos <input type=file>:
   trata erro com toast e limpa o value depois, para permitir escolher o mesmo
   arquivo duas vezes seguidas.
   ========================================================================== */

"use strict";

// Redesenha os tres paineis de uma vez. Chamada apos qualquer mudanca no estado.
function renderAll() { renderTrack(); renderStage(); renderInsp(); }

// Liga todos os eventos da interface e faz o primeiro render.
function init() {
  $("courseTitle").value = S.title;
  $("courseTitle").addEventListener("input", function (e) { S.title = e.target.value; });

  $("btnAddPdf").addEventListener("click", function () { $("filePdf").click(); });
  $("btnAddImg").addEventListener("click", function () { replaceTarget = null; $("fileImg").click(); });
  $("btnAddVideo").addEventListener("click", function () {
    var v = newVideo();
    var i = S.sel ? pageIndex(S.sel) + 1 : S.pages.length;
    S.pages.splice(i, 0, v);
    select(v.id);
  });
  $("btnAddQuiz").addEventListener("click", function () {
    if (quizPage()) { toast("Já existe um quiz. Edite o que está na trilha."); select(quizPage().id); return; }
    var q = newQuiz();
    S.pages.push(q);
    select(q.id);
  });

  $("btnOverview").addEventListener("click", function () {
    S.inspMode = "course";
    renderAll();
  });
  $("btnExport").addEventListener("click", openDrawer);
  $("drawerCancel").addEventListener("click", closeDrawer);
  $("drawerGo").addEventListener("click", function () { exportZip().catch(function (e) { toastOff(); toast("Erro: " + e.message); }); });
  $("drawer").addEventListener("click", function (e) { if (e.target === $("drawer")) closeDrawer(); });

  $("btnPrev").addEventListener("click", function () {
    var i = pageIndex(S.sel); if (i > 0) select(S.pages[i - 1].id);
  });
  $("btnNext").addEventListener("click", function () {
    var i = pageIndex(S.sel); if (i >= 0 && i < S.pages.length - 1) select(S.pages[i + 1].id);
  });

  $("btnProjNew").addEventListener("click", newProject);
  $("btnProjSave").addEventListener("click", saveProject);
  $("btnProjOpen").addEventListener("click", function () { $("fileProj").click(); });

  // Liga um <input type=file> a uma funcao, tratando erro e limpando o valor depois.
  function hook(id, fn) {
    $(id).addEventListener("change", function (e) {
      var f = e.target.files;
      if (f && f.length) {
        Promise.resolve(fn(f)).catch(function (err) { toastOff(); toast("Erro: " + err.message); });
      }
      e.target.value = "";
    });
  }
  hook("filePdf", function (f) { return importPdf(f[0]); });
  hook("fileImg", function (f) { return importImages(f); });
  hook("fileZip", function (f) { return importZip(f[0]); });
  hook("fileVideo", function (f) { attachVideo(f[0]); });
  hook("fileProj", function (f) { return openProject(f[0]); });
  hook("fileLogo", async function (f) {
    S.logo = await readAsDataURL(f[0]);
    S.logoExt = (f[0].name.split(".").pop() || "png").toLowerCase();
    if (S.logoExt === "jpeg") S.logoExt = "jpg";
    S.inspMode = "course";
    renderInsp();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
  });

  window.addEventListener("beforeunload", function (e) {
    if (S.pages.length) { e.preventDefault(); e.returnValue = ""; }
  });

  renderAll();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
