/* =============================================================================
   ESTADO — unica fonte de verdade da ferramenta
   =============================================================================

   S guarda o curso inteiro. Nenhum outro arquivo mantem copia: todos leem e
   escrevem aqui e depois chamam renderAll() (app.js) para os tres paineis
   voltarem a refletir o estado.

   Cada item de S.pages e de um dos tres tipos:

     slide  { id, type:'slide', title, data (dataURL da imagem), ext }
     video  { id, type:'video', title, mode:'link'|'file',
              url,                                  // quando mode='link'
              file (Blob), fileName, fileSize, fileExt, pending,
              noSeek, requireWatch }                // quando mode='file'
     quiz   { id, type:'quiz', title,
              config:{ passingScore, allowRetry, blockWhenFailed,
                       randomize, showAnswers, showCorrect, subtitle, intro },
              questions:[ { id, text, feedbackOk, feedbackNo,
                            choices:[ { id, text, correct } ] } ] }

   S.sel guarda o id da pagina selecionada e S.inspMode ('course' ou 'page')
   decide qual painel o inspetor da direita mostra.

   Nada e enviado para servidor e nao ha autosave: o processamento e todo no
   navegador e fechar a aba perde o trabalho — por isso existe o "Salvar
   projeto" (project.js).

   Este arquivo carrega primeiro: as fabricas no fim dele sao usadas por
   praticamente todos os outros.
   ========================================================================== */

"use strict";

var S = {
  title: "Novo curso",
  primary: "#1b2733",
  logo: null,          // dataURL
  logoExt: "png",
  scorm: "2004",       // "2004" | "1.2"
  showProgress: true,
  freeNav: false,
  requireQuizPass: true,
  pdfWidth: 1600,
  pdfFormat: "jpeg",
  pages: [],
  sel: null,           // id da pagina selecionada
  inspMode: "course"   // "course" | "page"
};

/* ---------- FABRICAS: criam paginas e questoes novas ja com os padroes ---------- */
function newSlide(dataUrl, title, ext) {
  return { id: uid(), type: "slide", title: title || "", data: dataUrl, ext: ext || "jpg" };
}
// Cria uma pagina de video. mode='link' (YouTube/Vimeo) ou 'file' (MP4 no pacote).
function newVideo() {
  return {
    id: uid(), type: "video", title: "Vídeo",
    mode: "link",          // "link" (YouTube/Vimeo) | "file" (mp4 no pacote)
    url: "",
    file: null,            // Blob, só em memória
    fileName: "", fileSize: 0, fileExt: "mp4",
    pending: false,        // projeto reaberto sem o arquivo
    noSeek: false,         // impedir arrastar a barra
    requireWatch: false    // exigir assistir até o fim
  };
}
// Cria uma questao com 3 alternativas, a primeira marcada como correta.
function newQuestion() {
  return {
    id: uid(), text: "",
    choices: [
      { id: uid(), text: "", correct: true },
      { id: uid(), text: "", correct: false },
      { id: uid(), text: "", correct: false }
    ],
    feedbackOk: "", feedbackNo: ""
  };
}
// Cria a pagina de quiz com as regras padrao (nota 70%, nova tentativa liberada).
function newQuiz() {
  return {
    id: uid(), type: "quiz", title: "Avaliação",
    config: {
      passingScore: 70, allowRetry: true, randomize: false,
      showAnswers: true, showCorrect: false, blockWhenFailed: true,
      subtitle: "",   // vazio = usa o texto automatico de quizSubAuto()
      intro: ""
    },
    questions: [newQuestion()]
  };
}
