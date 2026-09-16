/* =============================================================================
   PROJETO — salvar, abrir e zerar
   =============================================================================

   O projeto e um .json com todo o estado de S. As imagens vao embutidas como
   dataURL, mas o binario do MP4 NAO vai: um video de 40 MB viraria 54 MB de
   texto base64. As paginas de video em modo arquivo sao salvas com
   pending=true e pedem o arquivo de novo quando o projeto e reaberto.

   Nao confundir com a exportacao (exporter.js): este .json e o arquivo de
   trabalho, para continuar editando depois; o .zip e o entregavel do LMS.
   ========================================================================== */

"use strict";

// Exporta o projeto em JSON. O binario do MP4 fica de fora de proposito.
function saveProject() {
  if (!S.pages.length) { toast("Nada para salvar ainda."); return; }
  var pages = S.pages.map(function (p) {
    var c = {};
    for (var k in p) {
      if (k === "file" || k === "_url") continue;   // Blob e object URL nao vao para o JSON
      c[k] = p[k];
    }
    if (p.type === "video" && p.mode === "file") c.pending = true;
    return c;
  });
  var out = {
    v: 2, title: S.title, primary: S.primary, logo: S.logo, logoExt: S.logoExt,
    scorm: S.scorm, showProgress: S.showProgress, freeNav: S.freeNav,
    requireQuizPass: S.requireQuizPass, pdfWidth: S.pdfWidth, pdfFormat: S.pdfFormat,
    pages: pages
  };
  var blob = new Blob([JSON.stringify(out)], { type: "application/json" });
  download(blob, slug(S.title) + "-projeto.json");
  var nv = S.pages.filter(function (p) { return p.type === "video" && p.mode === "file" && p.file; }).length;
  toast(nv
    ? "Projeto salvo. Os " + nv + " arquivo(s) de vídeo não vão no .json — guarde o MP4 junto e anexe ao reabrir."
    : "Projeto salvo. Guarde este arquivo para editar depois.", nv ? 6000 : 2600);
}

// Carrega um projeto JSON e normaliza as paginas de video (marca as pendentes).
async function openProject(file) {
  var txt = await file.text();
  var d;
  try { d = JSON.parse(txt); } catch (e) { toast("Arquivo de projeto inválido."); return; }
  if (!d || !d.pages) { toast("Este JSON não é um projeto da Bancada."); return; }
  S.title = d.title || "Curso";
  S.primary = d.primary || "#1b2733";
  S.logo = d.logo || null;
  S.logoExt = d.logoExt || "png";
  S.scorm = d.scorm === "1.2" ? "1.2" : "2004";
  S.showProgress = d.showProgress !== false;
  S.freeNav = !!d.freeNav;
  S.requireQuizPass = d.requireQuizPass !== false;
  S.pdfWidth = d.pdfWidth || 1600;
  S.pdfFormat = d.pdfFormat || "jpeg";
  S.pages = d.pages;
  S.pages.forEach(function (p) {
    // projetos salvos antes do campo Subtitulo nao tem a chave
    if (p.type === "quiz" && typeof p.config.subtitle !== "string") p.config.subtitle = "";
    if (p.type !== "video") return;
    if (!p.mode) p.mode = "link";              // projetos v1 só tinham link
    p.file = null;
    p._url = null;
    p.pending = p.mode === "file";
    p.noSeek = !!p.noSeek;
    p.requireWatch = !!p.requireWatch;
  });
  S.sel = S.pages.length ? S.pages[0].id : null;
  S.inspMode = "course";
  $("courseTitle").value = S.title;
  renderAll();
  var pend = S.pages.filter(function (p) { return p.type === "video" && p.pending; }).length;
  toast(pend
    ? "Projeto aberto. " + pend + " vídeo(s) precisam do arquivo MP4 anexado novamente."
    : "Projeto aberto.", pend ? 6000 : 2600);
}

// Zera o estado e volta para a tela inicial.
function newProject() {
  if (S.pages.length &&
      !confirm("Descartar o curso atual e começar do zero?\n\nSe quiser manter, cancele e use “Salvar projeto” antes.")) {
    return;
  }
  S.title = "Novo curso";
  S.primary = "#1b2733";
  S.logo = null;
  S.logoExt = "png";
  S.scorm = "2004";
  S.showProgress = true;
  S.freeNav = false;
  S.requireQuizPass = true;
  S.pdfWidth = 1600;
  S.pdfFormat = "jpeg";
  S.pages = [];
  S.sel = null;
  S.inspMode = "course";
  replaceTarget = null;
  $("courseTitle").value = S.title;
  renderAll();
  toast("Tudo limpo. Importe um PDF ou abra um pacote existente.");
}
