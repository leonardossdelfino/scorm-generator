/* =============================================================================
   INSPETOR: VIDEO
   =============================================================================

   Escolha da fonte (MP4 dentro do pacote ou link de YouTube/Vimeo), anexo do
   arquivo por botao ou arraste, e as duas travas de exibicao (noSeek e
   requireWatch) — quem as aplica no curso e o wireVideo() do player.

   O Blob do MP4 vive so em memoria: videoObjUrl() memoriza um object URL para
   a previa e dropObjUrl() o libera. Nem o Blob nem o object URL vao para o
   .json do projeto (ver saveProject, em project.js).
   ========================================================================== */

"use strict";

// Cria (e memoriza) o object URL do MP4 para a previa. Nao vai para o pacote.
function videoObjUrl(p) {
  if (!p.file) return "";
  if (!p._url) p._url = URL.createObjectURL(p.file);
  return p._url;
}
// Libera o object URL criado por videoObjUrl para nao vazar memoria.
function dropObjUrl(p) {
  if (p._url) { try { URL.revokeObjectURL(p._url); } catch (e) {} p._url = null; }
}

var videoTarget = null;

// Painel de video: escolha da fonte, URL ou arquivo MP4 e as travas de exibicao.
function renderInspVideo(host, p) {
  $("inspTitle").textContent = "Vídeo";
  if (!p.mode) p.mode = "link";
  var emb = toEmbed(p.url);

  var h = '<div class="fgrp"><label class="lbl" for="fTitle">Título</label>' +
    '<input class="inp" id="fTitle" value="' + esc(p.title) + '"></div>';

  h += '<div class="fgrp"><label class="lbl" for="fVMode">Fonte do vídeo</label>' +
    '<select class="inp" id="fVMode">' +
    '<option value="file"' + (p.mode === "file" ? " selected" : "") + ">Arquivo MP4 dentro do pacote</option>" +
    '<option value="link"' + (p.mode === "link" ? " selected" : "") + ">Link do YouTube ou Vimeo</option>" +
    "</select></div>";

  if (p.mode === "file") {
    if (p.pending) {
      h += '<div class="fgrp"><div class="note">O arquivo de vídeo não é guardado no projeto <span style="font-family:var(--mono)">.json</span>. ' +
        "Anexe novamente: <br><strong>" + esc(p.fileName || "vídeo") + "</strong></div>" +
        '<button class="btn btn-sm btn-primary" id="btnVFile" style="margin-top:8px">Anexar arquivo…</button></div>';
    } else if (p.file) {
      h += '<div class="fgrp"><label class="lbl">Arquivo</label>' +
        '<dl style="margin:0 0 8px"><div class="kv"><dt>Nome</dt><dd>' + esc(p.fileName) + "</dd></div>" +
        '<div class="kv"><dt>Tamanho</dt><dd>' + fmtBytes(p.fileSize) + "</dd></div></dl>" +
        '<div class="row"><button class="btn btn-sm" id="btnVFile">Trocar…</button>' +
        '<button class="btn btn-sm btn-danger" id="btnVDel">Remover</button></div></div>';
    } else {
      h += '<div class="fgrp"><div class="dropzone" id="vdrop">Arraste um MP4 aqui<br>ou ' +
        '<button class="btn btn-sm" id="btnVFile" style="margin-top:7px">escolha o arquivo</button></div></div>';
    }

    h += '<div class="sect"><h3 class="sect-h">Controle de exibição</h3>';
    h += '<label class="chk"><input type="checkbox" id="vNoSeek"' + (p.noSeek ? " checked" : "") +
      '><span>Impedir avançar a barra<br><span class="hint" style="margin:0">O aluno pode voltar, mas não pular adiante.</span></span></label>';
    h += '<label class="chk"><input type="checkbox" id="vReq"' + (p.requireWatch ? " checked" : "") +
      '><span>Exigir assistir até o fim<br><span class="hint" style="margin:0">Trava o botão “Avançar” até 95% do vídeo.</span></span></label>';
    h += "</div>";

    h += '<div class="sect"><div class="note">O MP4 vai dentro do .zip: sem anúncios, sem rastreamento do YouTube e funciona em rede fechada. ' +
      "Em troca, o pacote fica maior — muitos LMS limitam o upload a 100–250 MB.</div></div>";

  } else {
    h += '<div class="fgrp"><label class="lbl" for="fUrl">URL do vídeo</label>' +
      '<input class="inp" id="fUrl" value="' + esc(p.url) + '" placeholder="https://www.youtube.com/watch?v=…" spellcheck="false">' +
      '<p class="hint">' + (p.url
        ? (emb ? 'Reconhecido: <span style="font-family:var(--mono);font-size:11px">' + esc(emb) + "</span>" : "URL não reconhecida.")
        : "Aceita YouTube e Vimeo.") + "</p></div>";
  }

  h += moveBlock(p);
  host.innerHTML = h;

  bind("fTitle", "input", function (e) { p.title = e.target.value; renderTrack(); });
  bind("fVMode", "change", function (e) { p.mode = e.target.value; renderAll(); });
  bind("fUrl", "change", function (e) { p.url = e.target.value.trim(); renderStage(); renderInsp(); });
  bind("btnVFile", "click", function () { videoTarget = p.id; $("fileVideo").click(); });
  bind("btnVDel", "click", function () {
    dropObjUrl(p);
    p.file = null; p.fileName = ""; p.fileSize = 0; p.pending = false;
    renderAll();
  });
  bind("vNoSeek", "change", function (e) { p.noSeek = e.target.checked; });
  bind("vReq", "change", function (e) { p.requireWatch = e.target.checked; });

  var dz = $("vdrop");
  if (dz) {
    ["dragenter", "dragover"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("hot"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function () { dz.classList.remove("hot"); });
    });
    dz.addEventListener("drop", function (e) {
      e.preventDefault();
      var f = e.dataTransfer.files;
      if (f && f.length) { videoTarget = p.id; attachVideo(f[0]); }
    });
  }
  wireMove(p);
}

// Anexa o MP4 escolhido a pagina de video apontada por videoTarget.
function attachVideo(file) {
  var i = pageIndex(videoTarget);
  videoTarget = null;
  if (i < 0) return;
  var p = S.pages[i];
  if (!/^video\//.test(file.type) && !/\.(mp4|webm|m4v)$/i.test(file.name)) {
    toast("Formato não suportado. Use MP4 (H.264) ou WebM.");
    return;
  }
  dropObjUrl(p);
  p.file = file;
  p.fileName = file.name;
  p.fileSize = file.size;
  p.fileExt = (file.name.split(".").pop() || "mp4").toLowerCase();
  p.pending = false;
  p.mode = "file";
  renderAll();
  if (file.size > 100 * 1048576) {
    toast("Atenção: " + fmtBytes(file.size) + " pode estourar o limite de upload do LMS.", 5000);
  }
}
