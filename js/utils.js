/* =============================================================================
   UTILIDADES — helpers sem estado, usados por todos os outros arquivos
   =============================================================================

     ids e dom .......... uid, $
     escape ............. esc (HTML), xesc (XML do imsmanifest), pad3
     aviso flutuante .... toast, toastOff
     consultas em S ..... pageIndex, selPage, quizPage
     formatacao ......... fmtBytes, slug, quizSubAuto
     video por link ..... toEmbed
     arquivos ........... readAsDataURL, download

   quizSubAuto() precisa ficar identico ao trecho equivalente do player
   (bloco #tpl-player, em renderQuizForm), senao a previa do palco mostra uma
   linha e o curso exportado mostra outra.
   ========================================================================== */

"use strict";

function uid() {
  var a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
  for (var i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
function $(id) { return document.getElementById(id); }
// Escapa texto para uso seguro dentro de HTML.
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// Escapa texto para uso dentro de XML (imsmanifest.xml).
function xesc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
// Formata numero com 3 digitos: 1 -> 001. Usado nos nomes dos arquivos.
function pad3(n) { return ("00" + n).slice(-3); }

var toastT = null;
// Mostra um aviso flutuante no rodape. ms=0 deixa fixo ate chamar toastOff().
function toast(msg, ms) {
  var el = $("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toastT);
  if (ms !== 0) toastT = setTimeout(function () { el.style.display = "none"; }, ms || 2600);
}
// Esconde o aviso aberto por toast().
function toastOff() { var el = $("toast"); if (el) el.style.display = "none"; clearTimeout(toastT); }

// Posicao de uma pagina na trilha a partir do id, ou -1 se nao existir.
function pageIndex(id) {
  for (var i = 0; i < S.pages.length; i++) if (S.pages[i].id === id) return i;
  return -1;
}
// Objeto da pagina atualmente selecionada, ou null.
function selPage() { var i = pageIndex(S.sel); return i < 0 ? null : S.pages[i]; }
// Pagina de quiz da trilha (a ferramenta permite apenas uma), ou null.
function quizPage() {
  for (var i = 0; i < S.pages.length; i++) if (S.pages[i].type === "quiz") return S.pages[i];
  return null;
}

// Formata bytes em KB ou MB legivel.
function fmtBytes(n) {
  if (!n) return "0 KB";
  if (n < 1048576) return Math.round(n / 1024) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

// Converte texto livre em nome de arquivo (sem acento, minusculo, com hifens).
function slug(s) {
  return String(s || "curso").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "curso";
}

/* ---------- QUIZ: linha de subtitulo ---------- */
// Texto automatico exibido abaixo do titulo do quiz quando config.subtitle
// esta vazio. Precisa ser identico ao do player, senao a previa mente.
function quizSubAuto(p) {
  var n = p.questions.length;
  return n + (n === 1 ? " questão" : " questões") +
    " · nota mínima " + p.config.passingScore + "%" +
    " · " + (p.config.allowRetry ? "nova tentativa liberada" : "tentativa única");
}

/* ---------- VIDEO POR LINK: traducao de URL para URL de embed ---------- */
function toEmbed(url) {
  var u = String(url || "").trim();
  if (!u) return "";
  var m;
  m = u.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube(?:-nocookie)?\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/);
  if (m) return "https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0";
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return "https://player.vimeo.com/video/" + m[1];
  if (/^https?:\/\//i.test(u)) return u;
  return "";
}

/* ---------- ARQUIVOS: leitura de entrada e download de saida ---------- */
// Le um File como dataURL e devolve uma Promise.
function readAsDataURL(file) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function () { res(r.result); };
    r.onerror = function () { rej(new Error("Falha ao ler " + file.name)); };
    r.readAsDataURL(file);
  });
}

// Dispara o download de um Blob com o nome informado.
function download(blob, name) {
  var a = document.createElement("a");
  var url = URL.createObjectURL(blob);
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
}
