/* =============================================================================
   IMPORTADORES — tudo o que entra na trilha
   =============================================================================

   IMAGENS
     Cada imagem vira um slide. replaceTarget diz se o arquivo escolhido cria
     uma pagina nova ou substitui a imagem do slide atual (o inspetor de slide
     seta essa variavel antes de abrir o seletor). Multiplos arquivos entram
     ordenados por nome com ordenacao numerica, para slide-2 vir antes de
     slide-10.

   PDF
     Renderiza cada pagina num <canvas> e guarda o resultado como dataURL.
     Largura e formato vem de S.pdfWidth e S.pdfFormat. O motor de rasterizacao
     e o pdf.worker.min.js de js/vendor/, carregado pelo proprio pdf.js na
     primeira importacao — ver setupPdfWorker() e js/vendor/LEIA-ME.md.

   PACOTE .ZIP EXISTENTE
     importZip() tenta tres estrategias, em cascata:
       1. achou course-data.js  -> importPacoteProprio(), round-trip completo
          de um pacote gerado por esta ferramenta (recupera ate o MP4, que
          volta como Blob, entao a pagina de video nao fica pendente);
       2. achou course.json     -> mapeia o formato do SaaS de origem para o
          modelo daqui (allowRetryWhenFailed -> allowRetry, e assim por diante);
       3. nao achou nenhum dos dois -> plano B, importa so as imagens do zip.

   Todas escrevem em S.pages e chamam renderAll().
   ========================================================================== */

"use strict";

/* ---------- IMAGENS ---------- */
var replaceTarget = null;

// Importa imagens como slides novos, ou substitui a imagem do slide selecionado.
async function importImages(files) {
  if (!files.length) return;
  if (replaceTarget) {
    var p = selPage();
    if (p && p.type === "slide") {
      p.data = await readAsDataURL(files[0]);
      p.ext = (files[0].name.split(".").pop() || "png").toLowerCase();
    }
    replaceTarget = null;
    renderAll();
    return;
  }
  var arr = Array.prototype.slice.call(files).sort(function (a, b) {
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  for (var i = 0; i < arr.length; i++) {
    toast("Importando imagem " + (i + 1) + " de " + arr.length + "…", 0);
    var d = await readAsDataURL(arr[i]);
    var ext = (arr[i].name.split(".").pop() || "png").toLowerCase();
    S.pages.push(newSlide(d, "", ext === "jpeg" ? "jpg" : ext));
  }
  toastOff();
  if (!S.sel) S.sel = S.pages[0].id;
  S.inspMode = "page";
  renderAll();
  toast(arr.length + " slide(s) adicionado(s).");
}

/* ---------- PDF ---------- */
var workerReady = false;

// Aponta o pdf.js para o worker local. Nao baixa nada e nao usa fetch: quem
// carrega o arquivo e o proprio pdf.js, na primeira importacao.
//
// O pdf.js se adapta sozinho aos dois modos de uso, e e por isso que um
// caminho relativo basta aqui:
//   servido por HTTP  new Worker() funciona; rasteriza fora da thread da
//                     interface, que continua respondendo.
//   aberto em file://  new Worker() e recusado (origem "null"), o pdf.js cai
//                     no plano B e carrega o mesmo arquivo por <script src>,
//                     que nao sofre a restricao. Funciona, mas na thread da
//                     interface — a tela fica presa durante a conversao.
//
// Detalhes e o trecho do pdf.js que faz isso: js/vendor/LEIA-ME.md.
async function setupPdfWorker() {
  if (workerReady) return;
  if (typeof pdfjsLib === "undefined") {
    throw new Error("pdf.js não carregou. Confira se a pasta js/vendor/ está junto do gerador-scorm.html.");
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";
  workerReady = true;
}

// Rasteriza cada pagina do PDF em canvas e transforma em slide.
async function importPdf(file) {
  await setupPdfWorker();
  toast("Abrindo PDF…", 0);
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var added = 0;

  for (var n = 1; n <= pdf.numPages; n++) {
    toast("Convertendo página " + n + " de " + pdf.numPages + "…", 0);
    var page = await pdf.getPage(n);
    var base = page.getViewport({ scale: 1 });
    var vp = page.getViewport({ scale: S.pdfWidth / base.width });
    var cv = document.createElement("canvas");
    cv.width = Math.round(vp.width);
    cv.height = Math.round(vp.height);
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    var isPng = S.pdfFormat === "png";
    var d = cv.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92);
    S.pages.push(newSlide(d, "", isPng ? "png" : "jpg"));
    added++;
    cv.width = cv.height = 0;
    await new Promise(function (r) { setTimeout(r, 0); });
  }
  toastOff();
  if (!S.sel && S.pages.length) S.sel = S.pages[0].id;
  S.inspMode = "page";
  if (S.title === "Novo curso") {
    var nm = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim();
    if (nm) { S.title = nm; $("courseTitle").value = nm; }
  }
  renderAll();
  toast(added + " slide(s) importado(s) do PDF.");
}

/* ---------- PACOTE .ZIP EXISTENTE ---------- */
// Le um pacote SCORM existente e reconstroi o projeto (slides, quiz, cores e logo).
// Reimporta um pacote gerado por esta ferramenta, lendo o course-data.js.
// Recupera tudo, inclusive o MP4 — ele esta dentro do zip, entao volta como
// Blob e a pagina de video nao fica pendente.
async function importPacoteProprio(zip, entry) {
  var raw = await entry.async("string");
  var m = raw.match(/window\.COURSE\s*=\s*([\s\S]*?);?\s*$/);
  if (!m) throw new Error("course-data.js nao tem o formato esperado.");
  var d = JSON.parse(m[1]);

  // localiza um arquivo do zip pelo caminho relativo, tolerando pasta raiz
  function acha(ref) {
    if (!ref) return null;
    var alvo = String(ref).split("/").pop();
    var hit = null;
    zip.forEach(function (path, e) {
      if (hit || e.dir) return;
      if (path.split("/").pop() === alvo) hit = e;
    });
    return hit;
  }
  function mimeDe(ext) {
    return ext === "png" ? "image/png" : (ext === "webp" ? "image/webp" : "image/jpeg");
  }

  if (d.title) { S.title = d.title; $("courseTitle").value = d.title; }
  if (d.primary) S.primary = d.primary;
  if (d.scormVersion) S.scorm = d.scormVersion === "1.2" ? "1.2" : "2004";
  if (d.settings) {
    S.showProgress = d.settings.showProgress !== false;
    S.freeNav = !!d.settings.freeNav;
    S.requireQuizPass = d.settings.requireQuizPass !== false;
  }

  var novas = [], src = d.pages || [];
  for (var i = 0; i < src.length; i++) {
    var sp = src[i];
    toast("Importando página " + (i + 1) + " de " + src.length + "…", 0);

    if (sp.type === "slide") {
      var ent = acha(sp.file);
      if (!ent) continue;
      var ex = (sp.file.split(".").pop() || "png").toLowerCase();
      var b64 = await ent.async("base64");
      novas.push(newSlide("data:" + mimeDe(ex) + ";base64," + b64,
                          sp.title || "", ex === "jpeg" ? "jpg" : ex));

    } else if (sp.type === "video") {
      var v = newVideo();
      v.title = sp.title || "Vídeo";
      if (sp.src) {
        var ve = acha(sp.src);
        v.mode = "file";
        v.noSeek = !!sp.noSeek;
        v.requireWatch = !!sp.requireWatch;
        v.fileExt = (sp.src.split(".").pop() || "mp4").toLowerCase();
        if (ve) {
          var blob = await ve.async("blob");
          v.file = blob;
          v.fileName = sp.src.split("/").pop();
          v.fileSize = blob.size;
          v.pending = false;
        } else {
          v.pending = true;                       // manifest citava, zip nao tinha
          v.fileName = sp.src.split("/").pop();
        }
      } else {
        v.mode = "link";
        v.url = sp.embed || "";
      }
      novas.push(v);

    } else if (sp.type === "quiz") {
      var q = newQuiz();
      q.title = sp.title || "Avaliação";
      var c = sp.config || {};
      q.config.passingScore = Math.max(0, Math.min(100, parseInt(c.passingScore, 10) || 70));
      q.config.allowRetry = c.allowRetry !== false;
      q.config.blockWhenFailed = c.blockWhenFailed !== false;
      q.config.randomize = !!c.randomize;
      q.config.showAnswers = c.showAnswers !== false;
      q.config.showCorrect = !!c.showCorrect;
      q.config.subtitle = typeof c.subtitle === "string" ? c.subtitle : "";
      q.config.intro = typeof c.intro === "string" ? c.intro : "";
      q.questions = (sp.questions || []).map(function (oq) {
        var chs = (oq.choices || []).map(function (ch) {
          return { id: uid(), text: ch.text || "", correct: !!ch.correct };
        });
        if (!chs.length) chs = newQuestion().choices;
        if (!chs.some(function (x) { return x.correct; })) chs[0].correct = true;
        return {
          id: uid(), text: oq.text || "", choices: chs,
          feedbackOk: oq.feedbackOk || "", feedbackNo: oq.feedbackNo || ""
        };
      });
      if (!q.questions.length) q.questions = [newQuestion()];
      novas.push(q);
    }
  }

  var le = acha(d.logo);
  if (le) {
    var lex = (String(d.logo).split(".").pop() || "png").toLowerCase();
    S.logo = "data:" + mimeDe(lex) + ";base64," + (await le.async("base64"));
    S.logoExt = lex === "jpeg" ? "jpg" : lex;
  }

  toastOff();
  if (!novas.length) { toast("O pacote nao tinha paginas legiveis."); return; }
  S.pages = novas;
  S.sel = S.pages[0].id;
  S.inspMode = "course";
  renderAll();

  var nv = novas.filter(function (x) { return x.type === "video"; }).length;
  var nq = novas.filter(function (x) { return x.type === "quiz"; }).length;
  var qq = nq ? quizPage().questions.length : 0;
  toast("Pacote reaberto: " + novas.filter(function (x) { return x.type === "slide"; }).length +
        " slides, " + nv + " vídeo(s)" + (nq ? ", quiz com " + qq + " questões" : "") + ".", 5000);
}

async function importZip(file) {
  if (typeof JSZip === "undefined") throw new Error("JSZip não carregou. Confira se a pasta js/vendor/ está junto do gerador-scorm.html.");
  toast("Lendo pacote…", 0);
  var zip = await JSZip.loadAsync(file);

  // 1) pacote gerado por esta ferramenta (course-data.js)
  var proprio = null;
  zip.forEach(function (path, e) {
    if (!e.dir && /(^|\/)course-data\.js$/i.test(path)) proprio = e;
  });
  if (proprio) return importPacoteProprio(zip, proprio);

  // 2) pacote do SaaS de origem (data/course.json)
  var jsonEntry = null;
  zip.forEach(function (path, e) {
    if (!e.dir && /course\.json$/i.test(path)) jsonEntry = e;
  });

  if (!jsonEntry) {
    // fallback: só puxa as imagens que encontrar
    var imgs = [];
    zip.forEach(function (path, e) {
      if (!e.dir && /\.(png|jpe?g)$/i.test(path) && !/logo/i.test(path)) imgs.push({ path: path, e: e });
    });
    imgs.sort(function (a, b) { return a.path.localeCompare(b.path, undefined, { numeric: true }); });
    if (!imgs.length) { toastOff(); toast("Não encontrei course.json nem imagens neste .zip."); return; }
    for (var i = 0; i < imgs.length; i++) {
      toast("Importando " + (i + 1) + " de " + imgs.length + "…", 0);
      var b64 = await imgs[i].e.async("base64");
      var ext = imgs[i].path.split(".").pop().toLowerCase();
      var mime = ext === "png" ? "image/png" : "image/jpeg";
      S.pages.push(newSlide("data:" + mime + ";base64," + b64, "", ext === "jpeg" ? "jpg" : ext));
    }
    toastOff();
    S.sel = S.pages[0].id; S.inspMode = "page"; renderAll();
    toast(imgs.length + " imagem(ns) importada(s). Não havia dados de quiz.");
    return;
  }

  var raw = await jsonEntry.async("string");
  var data;
  try { data = JSON.parse(raw); }
  catch (e) { toastOff(); toast("course.json está corrompido (JSON inválido)."); return; }

  var prefix = jsonEntry.name.replace(/data\/course\.json$/i, "").replace(/course\.json$/i, "");

  if (data.name) { S.title = data.name; $("courseTitle").value = data.name; }
  if (data.colorScheme && data.colorScheme.primary) S.primary = data.colorScheme.primary;

  // Procura uma entrada dentro do zip pelo nome do arquivo, ignorando a pasta.
  function findFile(filename) {
    var hit = null;
    zip.forEach(function (path, e) {
      if (hit || e.dir) return;
      if (path.split("/").pop() === filename) hit = e;
    });
    return hit;
  }

  var srcPages = (data.pages || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  var newPages = [], done = 0;

  for (var k = 0; k < srcPages.length; k++) {
    var sp = srcPages[k];
    done++;
    toast("Importando página " + done + " de " + srcPages.length + "…", 0);

    if (sp.resourceType === "slide" && sp.filename) {
      var ent = findFile(sp.filename);
      if (!ent) continue;
      var b = await ent.async("base64");
      var ex = sp.filename.split(".").pop().toLowerCase();
      var mm = ex === "png" ? "image/png" : "image/jpeg";
      newPages.push(newSlide("data:" + mm + ";base64," + b,
        /^Slide \d+$/.test(sp.title || "") ? "" : (sp.title || ""),
        ex === "jpeg" ? "jpg" : ex));

    } else if (sp.resourceType === "video") {
      var v = newVideo();
      v.title = sp.title || "Vídeo";
      v.url = (sp.video && (sp.video.youtubeUrl || sp.video.vimeoUrl || sp.video.url)) || "";
      newPages.push(v);

    } else if (sp.resourceType === "quiz" && sp.quiz) {
      var q = newQuiz();
      q.title = sp.title || "Avaliação";
      q.questions = [];
      var oc = sp.quiz.config || {};
      q.config.passingScore = Math.max(0, Math.min(100, parseInt(oc.passingScore, 10) || 70));
      q.config.allowRetry = oc.allowRetryWhenFailed !== false;
      q.config.blockWhenFailed = oc.cannotProgressWhenFailed !== false;
      q.config.randomize = !!oc.randomizeQuestions;
      q.config.showAnswers = oc.showYourAnswers !== false;
      q.config.showCorrect = !!oc.showCorrectAnswer;
      q.config.subtitle = "";
      (sp.quiz.questions || []).forEach(function (oq) {
        var nq = {
          id: uid(), text: (oq.text || "").trim(),
          choices: (oq.choices || []).map(function (c) {
            return { id: uid(), text: (c.text || "").trim(), correct: !!c.correct };
          }),
          feedbackOk: (oq.feedback && oq.feedback.whenCorrect) || "",
          feedbackNo: (oq.feedback && oq.feedback.whenIncorrect) || ""
        };
        if (!nq.choices.length) return;
        if (!nq.choices.some(function (c) { return c.correct; })) nq.choices[0].correct = true;
        q.questions.push(nq);
      });
      if (!q.questions.length) q.questions = [newQuestion()];
      newPages.push(q);
    }
  }

  if (data.logo && data.logo.name) {
    var le = findFile(data.logo.name);
    if (le) {
      var lb = await le.async("base64");
      var lex = data.logo.name.split(".").pop().toLowerCase();
      S.logo = "data:" + (lex === "png" ? "image/png" : "image/jpeg") + ";base64," + lb;
      S.logoExt = lex === "jpeg" ? "jpg" : lex;
    }
  }

  toastOff();
  if (!newPages.length) { toast("Não consegui recuperar nenhuma página deste pacote."); return; }
  S.pages = newPages;
  S.sel = S.pages[0].id;
  S.inspMode = "course";
  renderAll();
  toast("Pacote importado: " + newPages.length + " páginas.");
}
