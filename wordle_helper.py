# wordle_asistan.py

KELIME_DOSYASI = "wordle_havuz.txt"  # istersen burada dosya adını değiştirebilirsin
ESIK_TAM_LISTE = 500                # Hepsi gri + çok aday varsa hepsini yazma
ORNEK_SAYISI = 20                   # Örnek olarak gösterilecek kelime sayısı

def kelimeleri_yukle(dosya_adi):
    kelimeler = []
    with open(dosya_adi, "r", encoding="utf-8") as f:
        for satir in f:
            kelime = satir.strip()
            if len(kelime) == 5 and " " not in kelime:
                kelimeler.append(kelime.lower())
    return kelimeler

def eslesiyor_mu(kelime, known_positions, cannot_be_at, required_letters, excluded_letters):
    kelime = kelime.lower()

    # 1) Yeşil harfler (bilinen pozisyonlar) uymalı
    for i, harf in enumerate(known_positions):
        if harf is not None and kelime[i] != harf:
            return False

    # 2) Bu pozisyonda olamayacak harfler (sarı / gri'den gelen kısıtlar)
    for i, yasak_seti in enumerate(cannot_be_at):
        if kelime[i] in yasak_seti:
            return False

    # 3) Sarı/yeşil olarak bildiğimiz tüm harfler kelimede en az bir kez olmalı
    for h in required_letters:
        if h not in kelime:
            return False

    # 4) Tamamen yasaklanan (gri) harfler kelimede hiç olmamalı
    for h in excluded_letters:
        if h in kelime:
            return False

    return True

def guncelle_kisitlar(tahmin, geri_bildirim, known_positions, cannot_be_at, required_letters, excluded_letters):
    tahmin = tahmin.lower()
    geri_bildirim = geri_bildirim.lower()

    # Önce sarı/yeşil harfleri işleyelim (required_letters'a eklenecekler)
    for i, (harf, durum) in enumerate(zip(tahmin, geri_bildirim)):
        if durum == "y":  # yeşil
            known_positions[i] = harf
            required_letters.add(harf)
        elif durum == "s":  # sarı
            cannot_be_at[i].add(harf)
            required_letters.add(harf)

    # Şimdi gri harfleri işleyelim
    for i, (harf, durum) in enumerate(zip(tahmin, geri_bildirim)):
        if durum == "g":  # gri
            # Eğer bu harf hiç sarı/yeşil olmadıysa, tamamen yasakla
            if harf not in required_letters:
                excluded_letters.add(harf)
            else:
                # Bu harf kelimede var ama bu pozisyonda olamaz
                cannot_be_at[i].add(harf)

def filtrele(kelimeler, known_positions, cannot_be_at, required_letters, excluded_letters):
    sonuc = []
    for k in kelimeler:
        if eslesiyor_mu(k, known_positions, cannot_be_at, required_letters, excluded_letters):
            sonuc.append(k)
    return sonuc

def main():
    print("Wordle Asistan'a Hoş Geldin!")
    print("Her turda tahminini ve geri bildirimi gireceksin.")
    print("Geri bildirim için:\n  g = gri, s = sarı, y = yeşil")
    print("Çıkmak için tahmine 'q' yazabilirsin.\n")

    tum_kelimeler = kelimeleri_yukle(KELIME_DOSYASI)
    print(f"Toplam {len(tum_kelimeler)} kelime yüklendi.\n")

    known_positions = [None] * 5             # yeşil harfler
    cannot_be_at = [set() for _ in range(5)] # bu pozisyonda olamayacak harfler
    required_letters = set()                 # mutlaka kelimede olması gereken harfler
    excluded_letters = set()                 # hiç olmaması gereken harfler

    adaylar = tum_kelimeler[:]  # başlangıçta tüm kelimeler aday

    tur = 1
    while True:
        print(f"\n=== {tur}. Tahmin ===")
        tahmin = input("Tahmin (5 harf, çıkmak için q): ").strip().lower()
        if tahmin == "q":
            print("Çıkılıyor...")
            break

        if len(tahmin) != 5:
            print("Lütfen tam 5 harfli bir kelime gir.")
            continue

        geri_bildirim = input("Geri bildirim (5 karakter, g/s/y örn: gsygy): ").strip().lower()
        if len(geri_bildirim) != 5 or any(ch not in "gsy" for ch in geri_bildirim):
            print("Geri bildirim 5 karakter olmalı ve sadece 'g', 's', 'y' içermeli.")
            continue

        # Kısıtları güncelle
        guncelle_kisitlar(tahmin, geri_bildirim,
                          known_positions, cannot_be_at,
                          required_letters, excluded_letters)

        # Adayları filtrele
        adaylar = filtrele(adaylar, known_positions, cannot_be_at,
                           required_letters, excluded_letters)

        print("\nUygun kelimeler:")
        if not adaylar:
            print("Hiç uygun kelime kalmadı! (Belki geri bildirimde bir hata vardır.)")
        else:
            hepsi_gri = all(ch == "g" for ch in geri_bildirim)

            if hepsi_gri and len(adaylar) > ESIK_TAM_LISTE:
                print(f"Tahminin tamamen gri ve {len(adaylar)} aday kelime var.")
                print(f"Hepsini yazmıyorum, örnek ilk {ORNEK_SAYISI} kelime:")
                for k in adaylar[:ORNEK_SAYISI]:
                    print(k)
            else:
                # Normal davranış: çok uzamasın diye ilk 50 tanesini göster
                max_goster = 50
                for k in adaylar[:max_goster]:
                    print(k)
                if len(adaylar) > max_goster:
                    print(f"... (toplam {len(adaylar)} kelime, ilk {max_goster} gösterildi)")
                else:
                    print(f"Toplam {len(adaylar)} kelime bulundu.")

        tur += 1

if __name__ == "__main__":
    main()