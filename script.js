const KELIME_DOSYASI = "wordle_havuz.txt";
const ESIK_TAM_LISTE = 500;
const ORNEK_SAYISI = 50;
const MAX_DOSYA_BOYUTU = 10 * 1024 * 1024; // 10MB limit

let allWords = [];
let candidates = [];

let knownPositions = Array(5).fill(null);
let cannotBeAt = Array.from({ length: 5 }, () => new Set());
let requiredLetters = new Set();
let excludedLetters = new Set();
let history = [];

const statusEl = document.getElementById("status");
const formEl = document.getElementById("guess-form");
const guessInput = document.getElementById("guess");
const resetBtn = document.getElementById("reset-btn");
const summaryEl = document.getElementById("summary");
const wordListEl = document.getElementById("word-list");
const tilesContainer = document.getElementById("tiles-container");
const historyListEl = document.getElementById("history-list");

const KEYBOARD_ROWS = [
  ["e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i"],
  ["z", "c", "v", "b", "n", "m", "ö", "ç"]
];

// --- Güvenlik: Input validation ---

// Türkçe alfabe: a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z
function sadeceHarfMi(str) {
    return /^[abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+$/.test(str);
  }
  
  function temizleInput(str) {
    return str.replace(/[^abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]/g, "").toLowerCase();
  }

// --- Kelimeleri yükle ---

async function loadWords() {
  try {
    const res = await fetch(KELIME_DOSYASI);

    // Dosya boyutu kontrolü (header üzerinden)
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_DOSYA_BOYUTU) {
      statusEl.textContent = "Kelime havuzu çok büyük. Lütfen daha küçük bir dosya kullanın.";
      return;
    }

    const text = await res.text();

    // Dosya boyutu kontrolü (içerik üzerinden)
    if (text.length > MAX_DOSYA_BOYUTU) {
      statusEl.textContent = "Kelime havuzu çok büyük. Lütfen daha küçük bir dosya kullanın.";
      return;
    }

    allWords = text
      .split("\n")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length === 5 && !w.includes(" ") && sadeceHarfMi(w));

    if (allWords.length === 0) {
      statusEl.textContent = "Kelime havuzu boş veya geçersiz.";
      return;
    }

    candidates = [...allWords];
    statusEl.textContent = `Toplam ${allWords.length} kelime yüklendi.`;
    updateResults();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Kelime havuzu yüklenemedi. Dosya yolunu kontrol et.";
  }
}

// --- Tile (kare) mantığı ---

function updateTileClass(tile) {
  tile.classList.remove("tile-grey", "tile-yellow", "tile-green");
  const state = Number(tile.dataset.state || "0");
  if (state === 0) tile.classList.add("tile-grey");     // gri
  else if (state === 1) tile.classList.add("tile-yellow"); // sarı
  else tile.classList.add("tile-green");                // yeşil
}

function createTile(letter, index) {
  const div = document.createElement("div");
  div.className = "tile tile-grey";
  // Güvenlik: textContent kullan (XSS koruması)
  div.textContent = letter.toUpperCase();
  div.dataset.index = String(index);
  div.dataset.state = "0"; // 0=g,1=s,2=y

  div.addEventListener("click", () => {
    let state = Number(div.dataset.state || "0");
    state = (state + 1) % 3;
    div.dataset.state = String(state);
    updateTileClass(div);
  });

  return div;
}

function renderTilesFromGuess() {
  let guess = guessInput.value.trim();

  // Güvenlik: Input temizleme
  guess = temizleInput(guess);

  // Input'u güncelle (kullanıcı özel karakter girerse temizlenmiş halini görsün)
  if (guessInput.value.trim() !== guess) {
    guessInput.value = guess;
  }

  tilesContainer.innerHTML = "";

  if (guess.length !== 5) return;

  // Güvenlik: Her karakterin harf olduğundan emin ol
  if (!sadeceHarfMi(guess)) {
    return;
  }

  [...guess].forEach((ch, idx) => {
    const tile = createTile(ch, idx);
    tilesContainer.appendChild(tile);
  });
}

function handleVirtualKey(letter) {
  let val = guessInput.value.trim().toLowerCase();
  if (val.length >= 5) return;
  val += letter;
  guessInput.value = val;
  renderTilesFromGuess();
}

function handleVirtualBackspace() {
  let val = guessInput.value.trim().toLowerCase();
  if (!val) return;
  val = val.slice(0, -1);
  guessInput.value = val;
  renderTilesFromGuess();
}

function handleVirtualEnter() {
  formEl.requestSubmit();
}

function renderVirtualKeyboard() {
  const kb = document.getElementById("virtual-keyboard");
  if (!kb) return;

  kb.innerHTML = "";

  KEYBOARD_ROWS.forEach((rowLetters, rowIndex) => {
    const row = document.createElement("div");
    row.className = "vk-row";

    rowLetters.forEach((letter) => {
      const key = document.createElement("button");
      key.type = "button";
      key.className = "vk-key";
      key.textContent = letter.toUpperCase();
      key.addEventListener("click", () => handleVirtualKey(letter));
      row.appendChild(key);
    });

    if (rowIndex === KEYBOARD_ROWS.length - 1) {
      const backspaceKey = document.createElement("button");
      backspaceKey.type = "button";
      backspaceKey.className = "vk-key wide backspace";
      backspaceKey.textContent = "SİL";
      backspaceKey.addEventListener("click", handleVirtualBackspace);
      row.appendChild(backspaceKey);

      const enterKey = document.createElement("button");
      enterKey.type = "button";
      enterKey.className = "vk-key wide";
      enterKey.textContent = "ENTER";
      enterKey.addEventListener("click", handleVirtualEnter);
      row.appendChild(enterKey);
    }

    kb.appendChild(row);
  });
}

function tilesToFeedback() {
  const tiles = tilesContainer.querySelectorAll(".tile");
  if (tiles.length !== 5) return null;

  let fb = "";
  tiles.forEach((tile) => {
    const state = Number(tile.dataset.state || "0");
    if (state === 0) fb += "g";
    else if (state === 1) fb += "s";
    else fb += "y";
  });
  return fb;
}

// Tahmin yazıldıkça kutuları güncelle
guessInput.addEventListener("input", renderTilesFromGuess);

// Enter'a basınca formu gönder
guessInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    formEl.requestSubmit();
  }
});

// Güvenlik: Klavye ile özel karakter girişini engelle
let invalidCharWarningShown = false;

guessInput.addEventListener("keypress", (e) => {
  const char = String.fromCharCode(e.which || e.keyCode);

  // Sadece Türkçe harf kontrolü
  if (!/[abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]/.test(char)) {
    e.preventDefault();

    // Uyarıyı her tuşta spam olmasın diye kısa süreliğe bir kez göster
    if (!invalidCharWarningShown) {
      invalidCharWarningShown = true;
      alert("Sadece Türkçe harf kullanabilirsin (a–z ve ç, ğ, ı, i, ö, ş, ü).");
      setTimeout(() => {
        invalidCharWarningShown = false;
      }, 1000);
    }
  }
});
// --- Wordle mantığı ---

function matches(word) {
  word = word.toLowerCase();

  // 1) Yeşiller
  for (let i = 0; i < 5; i++) {
    const ch = knownPositions[i];
    if (ch !== null && word[i] !== ch) return false;
  }

  // 2) Bu pozisyonda olamayacak harfler
  for (let i = 0; i < 5; i++) {
    if (cannotBeAt[i].has(word[i])) return false;
  }

  // 3) Gerekli harfler (sarı/yeşil)
  for (const h of requiredLetters) {
    if (!word.includes(h)) return false;
  }

  // 4) Tamamen yasaklanan (gri) harfler
  for (const h of excludedLetters) {
    if (word.includes(h)) return false;
  }

  return true;
}

function updateConstraints(guess, feedback) {
  guess = guess.toLowerCase();
  feedback = feedback.toLowerCase();

  // Güvenlik: Input validation
  if (!sadeceHarfMi(guess) || guess.length !== 5) {
    return;
  }

  if (!/^[gsy]{5}$/.test(feedback)) {
    return;
  }

  // Önce sarı/yeşil
  for (let i = 0; i < 5; i++) {
    const harf = guess[i];
    const durum = feedback[i];

    if (durum === "y") {
      knownPositions[i] = harf;
      requiredLetters.add(harf);
    } else if (durum === "s") {
      cannotBeAt[i].add(harf);
      requiredLetters.add(harf);
    }
  }

  // Sonra gri
  for (let i = 0; i < 5; i++) {
    const harf = guess[i];
    const durum = feedback[i];

    if (durum === "g") {
      if (!requiredLetters.has(harf)) {
        excludedLetters.add(harf);
      } else {
        cannotBeAt[i].add(harf);
      }
    }
  }
}

function recomputeCandidates(guess, feedback) {
  updateConstraints(guess, feedback);
  candidates = candidates.filter((w) => matches(w));
}

function addToHistory(guess, feedback) {
  history.push({ guess, feedback });

  if (!historyListEl) return;
  historyListEl.innerHTML = "";

  history.forEach(({ guess, feedback }) => {
    const li = document.createElement("li");

    const row = document.createElement("div");
    row.className = "history-row";

    const wordSpan = document.createElement("div");
    wordSpan.className = "history-word";
    wordSpan.textContent = guess.toUpperCase();

    const tilesWrap = document.createElement("div");
    tilesWrap.className = "history-tiles";

    [...guess].forEach((ch, i) => {
      const fb = feedback[i];
      const tile = document.createElement("div");
      tile.className = "history-tile";

      if (fb === "s") tile.classList.add("history-tile-yellow");
      else if (fb === "y") tile.classList.add("history-tile-green");

      tile.textContent = ch.toUpperCase();
      tilesWrap.appendChild(tile);
    });

    row.appendChild(wordSpan);
    row.appendChild(tilesWrap);
    li.appendChild(row);
    historyListEl.appendChild(li);
  });
}

function updateResults(lastFeedback) {
  wordListEl.innerHTML = "";

  if (candidates.length === 0) {
    summaryEl.textContent =
      "Hiç uygun kelime kalmadı. Geri bildirimde hata olabilir.";
    return;
  }

  const hepsiGri = lastFeedback && [...lastFeedback].every((c) => c === "g");

  if (hepsiGri && candidates.length > ESIK_TAM_LISTE) {
    summaryEl.textContent = `Tahmin tamamen gri ve ${candidates.length} aday kelime var. Örnek ilk ${ORNEK_SAYISI} gösteriliyor:`;
    const slice = candidates.slice(0, ORNEK_SAYISI);
    for (const w of slice) {
        const li = document.createElement("li");
        li.textContent = w;
        
        // YENİ EKLENEN KISIM: Kelimeye tıklama özelliği
        li.addEventListener("click", () => {
          guessInput.value = w; // Tıklanan kelimeyi inputa yaz
          renderTilesFromGuess(); // Renk seçeceğimiz kutucukları oluştur
          
          // İsteğe bağlı: Mobilde uzun bir listeden tıkladığında ekranı yukarı, inputun olduğu yere kaydırır
          document.querySelector(".container").scrollIntoView({ behavior: "smooth" });
        });
  
        wordListEl.appendChild(li);
      } for (const w of slice) {
      const li = document.createElement("li");
      li.textContent = w;
      wordListEl.appendChild(li);
    }
  } else {
    const maxShow = 200;
    const slice = candidates.slice(0, maxShow);
    for (const w of slice) {
        const li = document.createElement("li");
        li.textContent = w;
        
        // YENİ EKLENEN KISIM: Kelimeye tıklama özelliği
        li.addEventListener("click", () => {
          guessInput.value = w; // Tıklanan kelimeyi inputa yaz
          renderTilesFromGuess(); // Renk seçeceğimiz kutucukları oluştur
          
          // İsteğe bağlı: Mobilde uzun bir listeden tıkladığında ekranı yukarı, inputun olduğu yere kaydırır
          document.querySelector(".container").scrollIntoView({ behavior: "smooth" });
        });
  
        wordListEl.appendChild(li);
      }

    if (candidates.length > maxShow) {
      summaryEl.textContent = `Toplam ${candidates.length} kelime, ilk ${maxShow} gösteriliyor.`;
    } else {
      summaryEl.textContent = `Toplam ${candidates.length} kelime bulundu.`;
    }
  }
}

// --- Eventler ---

formEl.addEventListener("submit", (e) => {
  e.preventDefault();


  // Güvenlik: Input temizleme ve validation
  let guess = guessInput.value.trim().toLowerCase();

  // Güvenlik: Input temizleme
  guess = temizleInput(guess);
  
  // Hem uzunluk hem de alfabe kontrolü tek yerde
  // Güvenlik: Input temizleme
guess = temizleInput(guess);

// 1) Uzunluk kontrolü
if (guess.length !== 5) {
  alert("Tahmin tam 5 harfli olmalı.");
  guessInput.value = "";
  tilesContainer.innerHTML = "";
  return;
}

// 2) Alfabe (Türkçe harf) kontrolü
if (!sadeceHarfMi(guess)) {
  alert("Tahmin sadece Türkçe harflerden oluşmalı.");
  guessInput.value = "";
  tilesContainer.innerHTML = "";
  return;
}
  // Tahmine göre kutuları oluşturulmamışsa oluştur
  if (!tilesContainer.querySelector(".tile")) {
    renderTilesFromGuess();
  }

  const feedback = tilesToFeedback();
  if (!feedback || feedback.length !== 5) {
    alert("Lütfen her harfin kutusunda gri / sarı / yeşil durumunu tıklayarak seç.");
    return;
  }

  // Güvenlik: Feedback validation
  if (!/^[gsy]{5}$/.test(feedback)) {
    alert("Geri bildirim geçersiz.");
    return;
  }

  recomputeCandidates(guess, feedback);
  updateResults(feedback);
  addToHistory(guess, feedback);

  guessInput.value = "";
  tilesContainer.innerHTML = "";
  guessInput.focus();
});

resetBtn.addEventListener("click", () => {
  knownPositions = Array(5).fill(null);
  cannotBeAt = Array.from({ length: 5 }, () => new Set());
  requiredLetters = new Set();
  excludedLetters = new Set();
  candidates = [...allWords];
  tilesContainer.innerHTML = "";
  summaryEl.textContent = "Filtreler sıfırlandı.";
  history = [];
  if (historyListEl) {
    historyListEl.innerHTML = "";
  }
  updateResults();
});

// Başlangıçta kelimeleri yükle
loadWords();

// Sanal klavyeyi oluştur
renderVirtualKeyboard();