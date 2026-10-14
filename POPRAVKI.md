# Četrti pregled — 14. 10. 2026

Predogledi brez posameznih zagonov FFmpeg in zavračanja sličic ob vsakem premiku, vidni predogled med prenosom zavihka, popravljena paleta, stalna debelina odprte konice, prostorsko umirjena smer, sredinski ročaj širine besedila, risanje po zavrtenih vogalih in izvoz teh risb. Nova opomba ne obnavlja celotnega seznama in ohrani scroll.

Preverjeno: 23 osnovnih testov, 16 preverjanj četrtega pregleda, dejanski FFmpeg izvozi in GPU primerjave; poln pregled spletne strani brez premika scrolla (10369 px pred in po kliku). Hiter hover: največ 1,2 ms na kratkem testu; 40 premikov v 7,2 ms na 20-minutnem posnetku. Izvoz risbe v vogalu: 0 različnih barvnih komponent. Širši test porabe: približno 1,35 GB za vse procese z rotirano sliko 4K. To so lokalni testi, ne uporabnikove potrjene ocene.

# Tretji pregled — 14. 10. 2026

- Povečava do 5 %, ločena pravilna oznaka povečave in ohranitev črnega ozadja zunaj bounding boxa.
- Ozek meni z razširjenimi možnostmi pod izbrano ikono in skupnim sprotnim predogledom na vrhu.
- Polna trikotna ikona in druga, odprta puščica. Smer konice se oceni čez nastavljivo persistenčno dolžino, da drobni tresljaji ne obračajo konice. Vrh odprte puščice ostane na zaključni točki.
- Drsniki za mere ter urejanje območja z levim/desnim številčnim robom; orodja in območja se shranjujejo.
- Tesnejša višina besedila in premakljiv zgornji desni ročaj za vrtenje okoli sredine.
- Nova opomba ohrani isti položaj preglednice; nove zahteve so razvrščene po skupinah.
- C: zunanje SRT/VTT/ASS/SSA in vgrajene besedilne sledi. P: predogled prizora ob časovnici z nastavljivo velikostjo.
- Prenos zavihkov med okni, odpiranje novega okna z izvlekom zavihka, ohranitev vseh nastavitev zavihka in obnovitev več oken po ponovnem zagonu.
- Datoteke iz Explorerja se odprejo v nazadnje uporabljenem oknu. Obvestilo o spremembi hitrosti je levo zgoraj.

Preizkusi vsebujejo dejanski vlek zavihka in ročaja za rotacijo besedila, zunanje in vgrajene podnapise, pravi FFmpeg predogled, stabilnost puščice ter ponovni zagon z obnovitvijo dveh oken. Parametri in rezultati so v OUTPUT.

---

# Drugi pregled — 13. 10. 2026

- R ustvari premakljivo vrtišče pod kazalcem; vrtenje ohrani merilo, zoom pa še vedno drži točko pod kazalcem.
- Barva rotacijskih vogalov velja samo znotraj bounding boxa; zunanji robovi ostanejo črni.
- Popravljeni fokusni robovi zobnika, vnosa kota in izvoznih map; Enter potrdi kot. Izvozne kljukice so poravnane levo.
- Kompaktnejši risarski meni s kraco, kraco s trikotno puščico, A in radirko. Vsa številčna polja imajo prostor za puščici.
- Barvni drsniki se med vlečenjem ne ustvarjajo ponovno.
- Ctrl+Z/Y uporablja napisano črko na QWERTZ; risbe in zgodovina ostanejo ločene po zavihkih.
- Prostoročna puščica oceni tangento s kvadratnim prileganjem zadnjih točk po dolžini krivulje. Lomljena črta uporabi zadnji segment.
- Besedilo se piše v vodoravno škatlo na sliki, z nastavljivo širino in samodejno višino. Dodani B/I ter isti izbirnik barve.
- Ctrl+levi vlek povsod premika sliko; običajni vlek je na voljo za risanje in obrez.
- Radirka prikazuje tanko krožnico; oko vključi predogled vsebine pod risbo.
- Navadni Esc se sproži ob izpustu. Esc+1/2/3 zapre risanje/rotacijo/obrez, +4 centrira, +5 izniči rotacijo, +6 skrči okno, +7 ga poveča na največjo pravilno velikost, če je vključeno.
- Preglednica podpira Ctrl+V/Win+V za slike, ločeno zgodovino opomb, samodejno višino polj in novo zahtevo v pojavnem oknu. Arhiv in ocene ostanejo ohranjeni.

Preverjanje: 21 geometrijskih in FFmpeg testov, 18 preizkusov drugega pregleda z dejanskimi vnosi tipkovnice/miške, obstoječi preizkusi pregledovalnika in nastavitev, primerjava prikaza in izvoza po rotaciji. Rezultati in parametri so v OUTPUT.

---

# Popravki pregleda, 12. 10. 2026

Pripravljena aplikacija je ponovno sestavljena. Prejšnje uporabnikove ocene in opombe v preglednici so ohranjene; popravki jih ne spremenijo v kljukice. Tri izrecno nepreverjene vrstice (nedavne mape, prenosljivost in pomnilnik) imajo novo modro oznako. Pred spremembo je bila narejena kopija DATA/review-before-fixes.json.

- Odpravljena obravnava lastne EXE datoteke kot posnetka pri ponovnem zagonu oziroma odpiranju iz Explorerja.
- Poravnana povečava pod kazalcem po rotaciji; obrez zajame osno poravnani bounding box in izbrano ozadje. GPU raster in PNG izvoz sta v testih piksel za pikslom enaka (0°, 37°, 37,5°, 90°, 180°, 270°, tudi z zrcaljenji).
- Povečani časovni interval ustavi predvajanje na sličici O.
- Esc skrije risbe in jih ohrani; zmanjšanje okna je na Esc, povečanje na Shift+Esc. Dodatni korak za največje okno je privzeto izključen. Večkratni Esc iz fullscreen ostane znotraj zaslona.
- Nastavitve: zastavi in × v prvi vrstici, popravljen slovenski grb. Drsnik rotacije ima 12 px roba in razmika do vrednosti, dve decimalki, klik za vnos, brez fokusnega okvirja.
- Risanje: vidne vrstice z ikonami za črte, puščice, besedilo in radirko; barvni kvadratki odprejo skupni HSV/RGB izbirnik. Krog sledi V, RGB kvadrat sledi B. Ctrl+Z/Y deluje tudi po kliku polja orodja.
- Prehajanje po mapi ne sprašuje za potrditev risbe; brisanje ima temen dialog in privzeto Da.
- Izvoz: pri eni sličici najprej Slike; možnost odpiranja izreza (privzeto da), običajen video/samo zvok/video brez zvoka, audio format ali črna slika. Odstranjena omejitev bitne hitrosti, ki je poškodovala droben tekst.
- GIF se predvaja kot video. Pripravljen je konkretni FFV1 AVI za prvi preizkus pretvorbe.
- Preglednica: nalaganje slik in modra ● oznaka, ohranjene opombe ter poti slik v naslednjem promptu.

Preverjanje: 18 samodejnih jedrnih/FFmpeg testov; Electron preizkusi predvajanja, risanja, zavihkov, fullscreen in kodekov; nov kombinirani preizkus v OUTPUT/review_fixes_validation_2026-10-12T15-36-16-386Z/report.json; preizkus sestavljenega paketa. Pri testnem 12 px besedilu je povprečni SSIM 0.999837 glede na dekodirani izvirnik. Zelo kratek statični izrez je bil na sekundo približno 2.35-krat večji: začetna ključna sličica in glave so pri kratkem izrezu večji delež. Visoka kakovost in enaka relativna velikost nista vedno hkrati mogoči. Nespremenjen celoten združljiv posnetek se še vedno kopira identično. Test s sliko 4K in rotacijo je skupaj porabil približno 1.32 GiB v procesih Electron; to je meritev tega preizkusa, ne univerzalna garancija.

Privzete povezave: dejansko odpiranje MKV in OGG po novi sestavi deluje; AVIF še odpre Windowsov izbor programa. SVG je izključen. Splošno prisilno nastavljanje modernih uporabniških privzetih aplikacij brez Windowsovega potrjevanja nima podprtega API-ja. Registracijska skripta zato odpre stran te aplikacije in ne trdi, da je vse že nastavljeno.
