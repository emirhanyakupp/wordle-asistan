# Temiz ve benzersiz kelimeleri tutmak için 'set' (küme) kullanıyoruz
temiz_kelimeler = set()

# GitHub'dan indirdiğin words.txt dosyasını okuyoruz
with open('words.txt', 'r', encoding='utf-8') as dosya:
    for satir in dosya:
        kelime = satir.strip()
        
        # İçinde boşluk olan kelime gruplarını (örn: "aba güreşi") atla
        if ' ' in kelime:
            continue
            
        # Türkçe I ve İ harflerini düzgün küçültmek için ufak bir ayar
        kelime = kelime.replace('I', 'ı').replace('İ', 'i').lower()
        
        # Şapkalı harfleri Wordle standardına göre normale çevir
        kelime = kelime.replace('â', 'a').replace('î', 'i').replace('û', 'u')
        
        # Sadece 5 harfli olanları kümeye ekle (set olduğu için tekrarlar otomatik elenir)
        if len(kelime) == 5:
            temiz_kelimeler.add(kelime)

# Alfabetik sıraya sokup yeni dosyaya kaydediyoruz
with open('wordle_havuz.txt', 'w', encoding='utf-8') as yeni_dosya:
    for k in sorted(temiz_kelimeler):
        yeni_dosya.write(k + '\n')
        
print(f"İşlem tamam! Toplam {len(temiz_kelimeler)} adet benzersiz 5 harfli kelime kaydedildi.")