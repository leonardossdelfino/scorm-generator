/* =============================================================================
   EXPORTACAO — do estado S ao .zip do LMS
   =============================================================================

   Fluxo: openDrawer() -> validate() -> exportZip().

   VALIDAR
     validate() devolve uma lista de {ok, level, msg}. Itens com level='fail' e
     ok=false travam a exportacao; level='warn' e so informativo. E aqui que se
     decide se o pacote esta publicavel, entao vale manter as checagens
     explicitas e legiveis.

   O QUE ENTRA NO .ZIP
     imsmanifest.xml  gerado por manifest2004() ou manifest12()
     index.html       template #tpl-index com titulo e scripts injetados
     style.css        template #tpl-css
     player.js        template #tpl-player
     scorm.js         template #tpl-scorm
     course-data.js   buildCourseData() serializado em window.COURSE
     assets/          slides, logo e videos

   Slides e codigo sao comprimidos com DEFLATE; o MP4 entra com STORE, porque
   video ja e comprimido e recomprimir so gastaria tempo.

   tpl() le os templates direto do DOM do gerador-scorm.html. E por isso que os
   quatro blocos <script type="text/plain"> continuam dentro do HTML e nao
   viraram arquivos soltos: um <script> de tipo desconhecido ignora o atributo
   src, e buscar os arquivos por fetch() quebraria a ferramenta em file://.
   ========================================================================== */

"use strict";

/* ---------- VALIDAR ---------- */
// Checklist pre-exportacao. Itens level='fail' travam a geracao do zip.
function validate() {
  var out = [];
  out.push({ ok: S.pages.length > 0, level: "fail", msg: S.pages.length + " página(s) na trilha" });
  out.push({ ok: !!S.title.trim(), level: "fail", msg: "Curso tem título" });

  var vids = S.pages.filter(function (p) { return p.type === "video"; });
  if (vids.length) {
    var linkVids = vids.filter(function (p) { return (p.mode || "link") === "link"; });
    var fileVids = vids.filter(function (p) { return p.mode === "file"; });

    var badLink = linkVids.filter(function (p) { return !toEmbed(p.url); });
    if (linkVids.length) {
      out.push({
        ok: badLink.length === 0, level: "fail",
        msg: badLink.length ? badLink.length + " vídeo(s) por link sem URL válida"
                            : linkVids.length + " vídeo(s) por link com URL válida"
      });
      out.push({ ok: true, level: "warn", msg: "Vídeo por link pode exibir anúncios e exige internet aberta" });
    }

    var noFile = fileVids.filter(function (p) { return !p.file; });
    if (fileVids.length) {
      out.push({
        ok: noFile.length === 0, level: "fail",
        msg: noFile.length ? noFile.length + " vídeo(s) MP4 sem arquivo anexado"
                           : fileVids.length + " vídeo(s) MP4 no pacote"
      });
    }
  }

  var qp = quizPage();
  if (!qp) {
    out.push({ ok: false, level: "warn", msg: "Sem quiz — o curso não vai registrar nota" });
  } else {
    var noText = qp.questions.filter(function (q) { return !q.text.trim(); }).length;
    var badCorr = qp.questions.filter(function (q) {
      return q.choices.filter(function (c) { return c.correct; }).length !== 1;
    }).length;
    var emptyCh = qp.questions.filter(function (q) {
      return q.choices.some(function (c) { return !c.text.trim(); });
    }).length;

    out.push({ ok: noText === 0, level: "fail", msg: noText ? noText + " questão(ões) sem enunciado" : qp.questions.length + " questões com enunciado" });
    out.push({ ok: badCorr === 0, level: "fail", msg: badCorr ? badCorr + " questão(ões) sem exatamente uma resposta correta" : "Todas as questões têm 1 resposta correta" });
    out.push({ ok: emptyCh === 0, level: "fail", msg: emptyCh ? emptyCh + " questão(ões) com alternativa vazia" : "Nenhuma alternativa vazia" });

    var need = Math.ceil(qp.questions.length * qp.config.passingScore / 100);
    out.push({ ok: true, level: "warn", msg: "Aprovação: " + qp.config.passingScore + "% = " + need + " de " + qp.questions.length + " acertos" });
  }

  var bytes = 0;
  S.pages.forEach(function (p) {
    if (p.type === "slide") bytes += p.data.length * 0.75;
    if (p.type === "video" && p.file) bytes += p.fileSize;
  });
  if (S.logo) bytes += S.logo.length * 0.75;
  var mb = bytes / 1048576;
  out.push({
    ok: mb < 100, level: "warn",
    msg: "Mídia: ~" + mb.toFixed(1) + " MB" + (mb > 100 ? " (acima do limite de muitos LMS)" : "")
  });

  return out;
}

/* ---------- COURSE-DATA.JS ---------- */
// Monta o objeto que virara o course-data.js dentro do pacote.
function buildCourseData(fileMap) {
  var pages = S.pages.map(function (p) {
    if (p.type === "slide") {
      return { id: p.id, type: "slide", title: p.title || "", file: fileMap[p.id] };
    }
    if (p.type === "video") {
      if (p.mode === "file") {
        return {
          id: p.id, type: "video", title: p.title || "",
          src: fileMap[p.id],
          noSeek: !!p.noSeek,
          requireWatch: !!p.requireWatch
        };
      }
      return { id: p.id, type: "video", title: p.title || "", embed: toEmbed(p.url) };
    }
    return {
      id: p.id, type: "quiz", title: p.title || "Avaliação",
      config: {
        passingScore: p.config.passingScore,
        allowRetry: !!p.config.allowRetry,
        blockWhenFailed: !!p.config.blockWhenFailed,
        randomize: !!p.config.randomize,
        showAnswers: !!p.config.showAnswers,
        showCorrect: !!p.config.showCorrect,
        subtitle: p.config.subtitle || "",
        intro: p.config.intro || ""
      },
      questions: p.questions.map(function (q) {
        return {
          id: q.id, text: q.text,
          choices: q.choices.map(function (c) { return { id: c.id, text: c.text, correct: !!c.correct }; }),
          feedbackOk: q.feedbackOk || "", feedbackNo: q.feedbackNo || ""
        };
      })
    };
  });

  return {
    title: S.title,
    primary: S.primary,
    logo: S.logo ? "assets/logo." + S.logoExt : null,
    scormVersion: S.scorm,
    settings: {
      showProgress: !!S.showProgress,
      freeNav: !!S.freeNav,
      requireQuizPass: !!S.requireQuizPass
    },
    pages: pages
  };
}

/* ---------- IMSMANIFEST.XML ---------- */
// Gera o imsmanifest.xml no formato SCORM 2004 4a edicao.
function manifest2004(files) {
  var id = "course-" + uid();
  var t = xesc(S.title);
  var fileTags = files.map(function (f) { return '      <file href="' + xesc(f) + '" />'; }).join("\n");
  return '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n' +
'<manifest identifier="' + id + '" version="1"\n' +
'  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"\n' +
'  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
'  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"\n' +
'  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"\n' +
'  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"\n' +
'  xmlns:imsss="http://www.imsglobal.org/xsd/imsss">\n' +
'  <metadata>\n' +
'    <schema>ADL SCORM</schema>\n' +
'    <schemaversion>2004 4th Edition</schemaversion>\n' +
'  </metadata>\n' +
'  <organizations default="ORG">\n' +
'    <organization identifier="ORG">\n' +
'      <title>' + t + '</title>\n' +
'      <item identifier="ITEM1" identifierref="RES1" isvisible="true">\n' +
'        <title>' + t + '</title>\n' +
'        <imsss:sequencing>\n' +
'          <imsss:deliveryControls tracked="true" completionSetByContent="true" objectiveSetByContent="true"/>\n' +
'        </imsss:sequencing>\n' +
'      </item>\n' +
'    </organization>\n' +
'  </organizations>\n' +
'  <resources>\n' +
'    <resource identifier="RES1" type="webcontent" adlcp:scormType="sco" href="index.html">\n' +
fileTags + '\n' +
'    </resource>\n' +
'  </resources>\n' +
'</manifest>\n';
}

// Gera o imsmanifest.xml no formato SCORM 1.2 (com masteryscore).
function manifest12(files) {
  var id = "course-" + uid();
  var t = xesc(S.title);
  var qp = quizPage();
  var mastery = qp ? '\n        <adlcp:masteryscore>' + qp.config.passingScore + "</adlcp:masteryscore>" : "";
  var fileTags = files.map(function (f) { return '      <file href="' + xesc(f) + '" />'; }).join("\n");
  return '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n' +
'<manifest identifier="' + id + '" version="1"\n' +
'  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"\n' +
'  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"\n' +
'  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
'  <metadata>\n' +
'    <schema>ADL SCORM</schema>\n' +
'    <schemaversion>1.2</schemaversion>\n' +
'  </metadata>\n' +
'  <organizations default="ORG">\n' +
'    <organization identifier="ORG">\n' +
'      <title>' + t + '</title>\n' +
'      <item identifier="ITEM1" identifierref="RES1" isvisible="true">\n' +
'        <title>' + t + '</title>' + mastery + '\n' +
'      </item>\n' +
'    </organization>\n' +
'  </organizations>\n' +
'  <resources>\n' +
'    <resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html">\n' +
fileTags + '\n' +
'    </resource>\n' +
'  </resources>\n' +
'</manifest>\n';
}

/* ---------- GERACAO DO PACOTE ---------- */
// Le um dos templates do player guardados nos blocos <script type=text/plain>.
function tpl(id) { return document.getElementById(id).textContent; }

// Monta o pacote completo em memoria e dispara o download do .zip.
async function exportZip() {
  if (typeof JSZip === "undefined") { toast("JSZip não carregou. Confira se a pasta js/vendor/ está junto do gerador-scorm.html."); return; }
  var hard = validate().filter(function (v) { return !v.ok && v.level === "fail"; });
  if (hard.length) { toast("Corrija os itens marcados em vermelho antes de gerar."); return; }

  toast("Gerando pacote…", 0);
  var zip = new JSZip();
  var files = ["index.html", "style.css", "player.js", "scorm.js", "course-data.js"];
  var fileMap = {};
  var n = 0;

  // slides
  S.pages.forEach(function (p) {
    if (p.type !== "slide") return;
    n++;
    var ext = p.ext === "jpeg" ? "jpg" : p.ext;
    var name = "assets/slide-" + pad3(n) + "." + ext;
    fileMap[p.id] = name;
    zip.file(name, p.data.split(",")[1], { base64: true });
    files.push(name);
  });

  if (S.logo) {
    var ln = "assets/logo." + S.logoExt;
    zip.file(ln, S.logo.split(",")[1], { base64: true });
    files.push(ln);
  }

  // videos em arquivo
  var vn = 0;
  S.pages.forEach(function (p) {
    if (p.type !== "video" || p.mode !== "file" || !p.file) return;
    vn++;
    var ex = (p.fileExt || "mp4").toLowerCase();
    var vname = "assets/video-" + pad3(vn) + "." + ex;
    fileMap[p.id] = vname;
    zip.file(vname, p.file, { compression: "STORE" });
    files.push(vname);
  });

  var data = buildCourseData(fileMap);

  // index.html
  var scripts = ["course-data.js", "scorm.js", "player.js"].map(function (s) {
    return "<" + "script src=\"" + s + "\"><" + "/script>";
  }).join("\n");
  var idx = tpl("tpl-index")
    .replace(/@@TITLE@@/g, esc(S.title))
    .replace("@@SCRIPTS@@", scripts);

  zip.file("index.html", idx);
  zip.file("style.css", tpl("tpl-css"));
  zip.file("player.js", tpl("tpl-player"));
  zip.file("scorm.js", tpl("tpl-scorm"));
  zip.file("course-data.js", "window.COURSE = " + JSON.stringify(data, null, 1) + ";\n");
  zip.file("imsmanifest.xml", S.scorm === "2004" ? manifest2004(files) : manifest12(files));

  var blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    function (m) { toast("Compactando… " + Math.round(m.percent) + "%", 0); }
  );
  toastOff();
  download(blob, slug(S.title) + "-scorm" + (S.scorm === "2004" ? "2004" : "12") + ".zip");
  closeDrawer();
  toast("Pacote gerado. Teste no SCORM Cloud antes de subir no LMS.");
}

/* ---------- PAINEL DE EXPORTACAO (modal) ---------- */
// Abre o painel de exportacao com o resultado de validate().
function openDrawer() {
  var v = validate();
  var h = '<ul class="checklist">';
  v.forEach(function (item) {
    var cls = item.ok ? "pass" : (item.level === "warn" ? "warn" : "fail");
    var m = item.ok ? "\u2713" : (item.level === "warn" ? "!" : "\u2717");
    h += '<li class="' + cls + '"><span class="m">' + m + "</span><span>" + esc(item.msg) + "</span></li>";
  });
  h += "</ul>";

  h += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">' +
    '<dl style="margin:0">' +
    '<div class="kv"><dt>Versão</dt><dd>' + (S.scorm === "2004" ? "SCORM 2004 4ª ed." : "SCORM 1.2") + "</dd></div>" +
    '<div class="kv"><dt>Arquivo</dt><dd>' + esc(slug(S.title)) + "-scorm…zip</dd></div>" +
    "</dl></div>";

  var hard = v.filter(function (x) { return !x.ok && x.level === "fail"; });
  if (hard.length) {
    h += '<p class="note" style="margin-top:14px">Resolva os itens com ✗ para liberar a geração.</p>';
  }
  $("drawerBody").innerHTML = h;
  $("drawerGo").disabled = hard.length > 0;
  $("drawer").classList.add("open");
}
// Fecha o painel de exportacao.
function closeDrawer() { $("drawer").classList.remove("open"); }
