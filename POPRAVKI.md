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

---

# Peti pregled — različica 2.2.0, 14. 10. 2026

- Predogled časovnice ima možnost, da širina in višina pomenita največji meri; dejanska velikost sledi razmerju posnetka. Možnost je privzeto vključena.
- Odtrgani zavihek med vlečenjem uporablja pravo okno velikosti izvornega okna. Zavihek ohrani širino in mesto v vrstici; ob izpustu se animirano premakne levo. Začasno okno se ne zapisuje v zgodovino in med vlečenjem ne podvaja zvoka.
- Risarski meni ima sive gumbe čez celo vrstico, sredinsko poravnane ikone, ločilne črte in barvne pravokotnike. Od in Do odpirata ločena dialoga. Dvoklik krogeca drsnika odpre natančen vnos trenutne vrednosti.
- Ikoni obeh puščic sta povezani in pravilno usmerjeni. Končana puščica ohrani narisano krivuljo, brez vsiljenega ravnega segmenta. Smer se posodablja po razdalji narisane poti, ne po številu osvežitev prikaza; obračanje je omejeno in pri nejasni smeri ostane stabilno.
- Radirka sproti obdeluje nove točke, združuje dogodke miške in na GPU prenaša le spremenjeno območje. Razveljavitev, ponovitev in izvoz še vedno uporabljajo celotno shranjeno risbo.
- Nova opomba ne obnavlja celotnega seznama in ne preusmeri fokusa na razširjeno polje. Pri menjavi ocene se ohranita višina seznama in položaj drsnika. Opombe in ocene uporabnika so ohranjene. Testna zahteva »tset« je arhivirana.
- Glavni README in opis izdaj na GitHubu sta v angleščini; slovenska navodila so v README.sl.md.

Preverjanje: 26 jedrnih in FFmpeg testov, sedem preizkusov petega pregleda v Electronu, trije preizkusi opomb na celotnem seznamu, 16 preizkusov prejšnjega pregleda ter kombinirani preizkus izvoza, povečave, obreza in fullscreen. Preverjena sta tudi obnova obeh oken po ponovnem zagonu in sestavljeni paket. Na testni sliki 4K z 80.000 starimi točkami je radirka opravila 140 delnih in nič celotnih prenosov teksture; mediana osvežitve je bila 1,3 ms, 95. percentil 6,5 ms. To so lokalne meritve tega preizkusa. Pri novi opombi je položaj na dolgi strani ostal 11299 px pred in po kliku; tudi preizkus v vgrajenem brskalniku je ohranil položaj. Rezultati, parametri in slike so shranjeni v OUTPUT.

---

# Šesti pregled — različica 2.3.0, 14. 10. 2026

- Zavihki imajo nastavljiv navpični odmik za odtrganje (privzeto 28 px). Okno z enim zavihkom se premika neposredno; odtrgan zavihek iz maksimiziranega okna uporabi njegovo normalno velikost. Pri priključevanju se animirano pokaže mesto vstavljanja in premaknejo sosednji zavihki. Vlečenje desnega zavihka uporablja tudi prazni del vrstice.
- Risarski meni ima štiri sive odtenke, zaobljene obrobljene gumbe in okvir opcij pod njihovim naslovom. Barva, pisava/slog ter predogled pod risbo imajo dosledne naslove. Font je poleg B/I, drsniki so modri, gumbi dialogov pa levo poravnani.
- Filter puščic ima ločeni nastavitvi za dolžino poti in najmanjšo valovno dolžino. Koordinati x(s) in y(s) sta filtrirani z jedrom treh zaporednih nizkoprepustnih stopenj; smer določi odvod na koncu filtrirane poti. Pri šibkem odvodu smer ostane stabilna. Omejitev obračanja deluje že od prvega premika; stare risbe brez nove nastavitve uporabijo svojo prvotno persistenčno dolžino tudi kot valovno dolžino.
- Polja za opombe so naravno rastoča urejevalna polja. Ni več začasnega skrčenja besedilnega polja pri merjenju višine ali obnove celotnega seznama ob novi opombi, menjavi ocene oziroma koncu urejanja zahteve.
- Slike se lepijo neposredno v polje osnovne zahteve ali posamezne opombe, tudi v pojavnem oknu za novo zahtevo. Ostanejo vezane na svojo fazo, tudi ko opomba postane zgodovinska. Štiri znane stare slike so povezane z ustreznimi opombami, preostale neoznačene slike ostanejo pri osnovni zahtevi. Ocene, besedila in arhiv uporabnika so ohranjeni.

Preverjanje vključuje dejanske vnose miške pri priključevanju zavihkov in risanju tresoče poti, dva prikaza dolge preglednice različnih širin, več zaporednih opomb, slike v trenutni in zgodovinski opombi, obnovo po ponovnem nalaganju ter nastanek naslednjega prompta. V vgrajenem brskalniku je položaj po dolgi opombi ostal 23655 px, po opombi s sliko pa 23816 px; prilepljena slika iz odložišča se je shranila v pravo fazo. Ločene testne kopije so v OUTPUT in niso del uporabnikovih ocen.

## 2.4.0 — sedmi pregled

- Dve neodvisni risarski okni, usklajene barve, barvne ikone in rahlo obarvan izbrani gumb; zaobljeni robovi brez črnega ločila, poravnani daljši drsniki.
- Dejanska priključitev zavihka in vsebine že pred izpustom miške, takojšnja menjava vsebine izvora, pripravljeno okno za hitrejše iztrganje, premikanje skozi prazen del vrstice.
- Ostra konica obeh vrst puščic brez spreminjanja uspešnega filtra.
- Nova zahteva brez skoka in brez spremembe slike strani; obe testni zahtevi trajno odstranjeni.
