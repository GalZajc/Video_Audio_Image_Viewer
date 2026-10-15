# Video Audio Image Viewer

Različica 2.5.0: risarski okni sledita aktivnemu zavihku in oknu; nastavitve orodij se ohranijo za vsak zavihek, po želji pa so skupne. Dodano je sprotno glajenje celotne krivulje in izbirna smer konice pri osnovnici. Stari deli puščice ne izginjajo več med risanjem. Odpeti zavihki ostanejo v ospredju in se odzivno prerazporejajo. Podrobnosti in preverjanja so spodaj.

Različica 2.4.0: dve neodvisni okni za risarska orodja in barvo, barvne ikone ter usklajene mere in predogledi. Zavihek se skupaj s posnetkom priključi drugemu oknu že med držanjem miške; izvor takoj pokaže preostali posnetek. Konice puščic ostanejo ostre brez spreminjanja sprejetega filtra. Dodajanje nove zahteve ohrani povsem enak prikaz strani, opombe in slike pa ostanejo povezane s svojo fazo pregleda.

Različica 2.2.0: predogled časovnice lahko tesno sledi razmerju posnetka znotraj največje širine in višine. Pri vlečenju zavihka je viden pravi pregledovalnik v velikosti izvornega okna. Risarski meni ima sive celovrstične gumbe, ločen vnos Od/Do in dvoklik drsnika za točno vrednost. Puščice ohranijo narisano krivuljo in imajo stabilnejšo smer, radirka pa osvežuje samo spremenjeni del slike. Nova opomba ohrani položaj strani. Podrobnosti trenutnega delovanja so tudi v angleškem [README](README.md).

Prenosljiv Electron pregledovalnik videa, zvoka in slik. Pripravljeno različico Windows x64 prenesi na [strani izdaj](https://github.com/GalZajc/Video_Audio_Image_Viewer/releases), razširi celoten ZIP in odpri priloženi `.vbs`. Zaženi **Video Audio Image Viewer.lnk** ali **Video Audio Image Viewer.vbs**. Bližnjico `.lnk` lahko kopiraš na namizje ali pripneš v Start. Pripravljena aplikacija je v `app/Video Audio Image Viewer-win32-x64/VideoAudioImageViewer.exe`; Node.js in ločena namestitev FFmpeg za uporabo nista potrebna.

Za sistematičen pregled funkcij odpri **Review features.vbs**. Lokalna spletna stran omogoča ✓/✕, modro ○ za »nisem preveril, verjetno deluje«, opombe, slike PNG/JPEG/WebP pri vsaki vrstici (največ 12 MB na sliko), dodatne zahteve ter kopiranje ali shranjevanje naslednjega prompta. Modre oznake se štejejo ločeno od preverjenih uspehov; prompt vsebuje tudi projektne poti priloženih slik. Ocene se samodejno shranjujejo v `DATA/review.json`, sestavljen prompt pa v `DATA/review-next-prompt.md`. Ko končaš, lahko v Codexu samo napišeš »Pregled je končan«. Stran uporablja priloženi Electron kot lokalni Node runtime in posluša samo na `127.0.0.1`; ločena namestitev ni potrebna.

## Bližnjice

| Bližnjica | Dejanje |
| --- | --- |
| Space | Predvajaj / premor |
| ← / → | Nazaj / naprej 5 sekund |
| , / . | Prejšnja / naslednja dejanska sličica |
| S / D | Hitrost − / + 10 odstotnih točk |
| I / O | Začetna / končna vključena sličica izreza |
| Shift + S | Prikaži / skrij prostorski obrez |
| Esc / Shift + Esc | Po zaprtju menijev in ponastavitvi pogleda: zmanjšaj / povečaj okno do razmerja posnetka |
| Esc + 1 / 2 / 3 | Zapri risanje / rotacijo / obrez |
| Esc + 4 / 5 | Centriraj pogled / izniči rotacijo |
| Esc + 6 / 7 | Skrči okno brez robov / največje okno brez robov (če je omogočeno) |
| Ctrl + S | Izvoz: izbira mape in nastavitve za ta izvoz |
| R | Prikaži / skrij zgornji drsnik rotacije, 0–360° v nasprotni smeri urinega kazalca |
| Shift + R | Zrcali okoli izvirne osi Y |
| Ctrl + Shift + R | Zrcali okoli izvirne osi X |
| Ctrl + D | Svinčnik, puščice, besedilo in radirka |
| Ctrl + Z / Ctrl + Y | Razveljavi / ponovi risbo oziroma besedilo |
| Ctrl + Shift + ← / → | Prejšnja / naslednja datoteka v isti mapi |
| Delete, Enter | Potrdi premik trenutne datoteke v koš; privzeto je izbran Da |
| Ctrl + O / Ctrl + T | Odpri datoteke v novih zavihkih |
| Ctrl + W | Zapri zavihek |
| Ctrl + Shift + T | Obnovi nazadnje zaprt zavihek, tudi po ponovnem zagonu |
| Ctrl + Tab / Ctrl + Shift + Tab | Naslednji / prejšnji zavihek |
| Ctrl + , | Nastavitve in premapiranje bližnjic |
| F | Skrij / pokaži zavihke znotraj okna |
| F11 ali dvoklik slike/videa | Pravi celozaslonski način |
| ↑ / ↓ / M | Glasnost / izklop zvoka |
| Alt + R | Ponastavi povečavo in premik |
| Ctrl + Backspace | Odstrani časovni interval in prostorski obrez |

Črkovne bližnjice sledijo napisani črki tudi na slovenski tipkovnici QWERTZ; ločila in druge tipke sledijo njihovim kodam. Bližnjice lahko spremeniš v nastavitvah. D pohitri predvajanje, Ctrl+D odpre risanje. R je rotacija, zato je neposredna ponastavitev pogleda Alt+R. Ctrl+S nadomesti prejšnji Ctrl+M. Obstoječe privzete nastavitve se samodejno preselijo; druge uporabniške preslikave se ohranijo.

## Miška, zavihki in slike

Med premorom ali pri sliki Ctrl+kolešček povečuje okoli kazalca, Ctrl+levi vlek pa premika sliko. Prikaz uporablja najbližje piksle, brez glajenja. Rotirana slika je najprej rasterizirana na mrežo vodoravnih in navpičnih pikslov, ki se nato povečajo v ostre kvadratke. WebGL2 izvaja preslikavo na GPU z enako geometrijo kot izvoz FFmpeg; ob nedostopnem GPU oziroma preveliki teksturi obstaja procesorski rezervni prikaz. Povečava in premik ponovno uporabita že izračunano mrežo. Povečava in premik se ohranita ob zrcaljenju. Rotacija in zrcaljenje delujeta na izvirno sliko in njeno risbo skupaj; zrcaljenji sta izvedeni pred rotacijo.

Prvi Shift+S postavi modri okvir znotraj vidnega dela povečane slike. Obrez je tudi po rotaciji poravnan z zaslonom in se nanaša na rasterizirano mrežo celotnega bounding boxa. Lahko zajame tudi zunanje vogale; barvo in prosojnost ozadja izbereš v nastavitvah z istim izbirnikom kot barvo risanja (privzeto črna). Vlek roba ali vogala prilagodi obrez na izvorne piksle. Skriti okvir ohrani obrez za izvoz. Esc najprej zapre odprti meni, risanje ali drsnik; nato skrije okvir, vrne povečano časovnico na celoten posnetek (ohrani I/O), ponastavi pogled, zmanjša okno do razmerja slike. Shift+Esc ga v tem koraku poveča. Dodatni Esc za največje centrirano okno je privzeto izključen in ga lahko vključiš v nastavitvah. Iz fullscreen se najprej obnovi običajno okno; vse mere so omejene na delovno območje zaslona. Vidna oziroma skrita vrstica zavihkov se upošteva.

Časovnica izgine po mirovanju miške tudi med premorom; pri slikah je ni. Dvoklik modrega intervala ga raztegne na celo časovnico in predvajanje omeji do vključene sličice O; naslednji dvoklik vrne celoten posnetek. I/O vključujeta mejni sličici. Enaka I/O sličica izvozi PNG. Prostorski obrez, rotacija, zrcaljenje in risbe se vključijo tudi v ta PNG.

Zavihki so visoki 28 px, imajo začetno širino 192 px in se skrčijo, ko zmanjka prostora. Vlek se odzove takoj, sosednji zavihki pa se animirano premaknejo. Srednji klik ali × zapre zavihek. Kazalec pokaže celotno pot, dvoklik pa odpre Explorer z izbrano datoteko. Ikone: video rdeč, zvok svetlo moder, slika temneje modra. Klik ikon omogoča vseh sedem kombinacij vrst za prehajanje po mapi. V nastavitvah izbereš sortiranje po imenu (naravno, npr. 2 pred 10), datumu spremembe/nastanka ali velikosti, naraščajoče ali padajoče. Prehajanje cikla okoli konca mape in zamenja datoteko v istem zavihku. Prehajanje ohrani risbo; nedokončano potezo zaključi brez dodatnega potrjevanja.

Podprte slike: PNG, JPEG, WebP, BMP, TIFF, AVIF, ICO in ročno odprt SVG. SVG je izključen iz privzetih povezav. GIF je video z animacijo, časovnico in izborom sličic. TIFF se po potrebi lokalno dekodira v PNG. SVG se izriše na izvorno velikost; izvoz ga rasterizira. Za omejevanje pomnilnika je privzeta meja 80 milijonov pikslov na sliko, nastavljiva v `config.json`.

## Risanje in besedilo

Ctrl+D odpre kompakten meni v zgornjem desnem vogalu z vrsticami za črto, puščico, besedilo in radirko. Barvni kvadratek odpre univerzalni izbirnik. Radirka odstranjuje samo narisane oznake, ne izvirnih pikslov. Esc skrije meni in oznake, ki ostanejo shranjene in se pokažejo ob ponovnem Ctrl+D. Premer črte ter širina in višina konice so v izvornih pikslih. Navaden vlek nariše prostoročno potezo. Shift+klik dodaja oglišča lomljene črte; Shift+klik obstoječega oglišča jo zaključi. Ctrl+Shift+klik omeji segment na 0°, 45°, 90° itd. Enter tudi zaključi lomljeno črto. Konica puščice je vrh enakokrakega trikotnika na zadnji točki, usmerjen po zadnjem segmentu.

Pri besedilu klikni ali povleci pravokotnik in vpiši besedilo v okno. Povlečen okvir določa prelom in obrez besedila; sam klik ustvari privzeti okvir. Pisave so Arial, Helvetica, Verdana, Consolas in Comic Sans MS, velikost je v izvornih pikslih. Če pisava v OS ni nameščena, se uporabi Arial. Barva je isti izbirnik kot za črte in puščice.

HSV krog odraža trenutno svetlost V in spreminja H ter S. V načinu RGB kvadrat kaže rez RGB kocke pri trenutnem B; spreminja R in G. Pod njim so štirje drsniki H/S/V/A oziroma R/G/B/A. Vrednosti se prikazujejo kot 0–255 ali normalizirano 0–1. H je normaliziran celoten obrat 0–360°. V in A ostaneta nespremenjena pri kliku kroga. Razveljavitev, ponovitev in vse risbe se hranijo ločeno po zavihkih; shranjeno stanje trenutne datoteke se obnovi po ponovnem zagonu.

## Izvoz

Ctrl+S odpre meni z mapami levo in nastavitvami izvoza desno. Na vrhu so mapa izvirnika in Prenosi ter uporabniške mape Slike/Videoposnetki/Glasba, s trenutno vrsto na prvem mestu. Nedavne mape so spodaj, najnovejša prva. Klik mape odpre običajen Windowsov dialog Shrani kot. Nastavitve v tem meniju veljajo za posamezen izvoz; globalne ostajajo v Nastavitvah. Privzeto so MP4, MP3 in PNG. Izbrana posamezna video sličica dobi Slike na prvo mesto med uporabniškimi mapami. Izvoz ponuja običajen video, samo zvok ter video brez zvoka. Pri samo zvoku izbereš zvočno datoteko ali video s črno sliko. Izrezek se privzeto odpre v novem zavihku; kljukico lahko spremeniš za ta izvoz ali globalno.

**Kakovost in velikost, podobni izvirniku** je privzeto vključena. Celoten združljiv, nespremenjen posnetek se kopira brez ponovnega kodiranja. Če ostane tudi isti format, se datoteka kopira povsem identično; enako velja za nespremenjeno sliko v istem formatu. Pri natančnem rezu, prostorskem obrezu, rotaciji ali risbah aplikacija ponovno kodira in oceni kakovost glede na izvorno bitno hitrost na piksel in sličico. Pri videu uporabi visoko kakovost (privzeto CRF 14, prilagojen v območju 10–16) brez omejitve bitne hitrosti, da ostane droben tekst berljiv; pri zvoku uporabi približno izvorno bitno hitrost v podprtem območju. To je približek, ne zagotovilo enake vizualne kakovosti ali velikosti za vsak kodek. Izklop izbire uporabi brezizgubni H.264 oziroma VP9: večje datoteke, a ohranjene dekodirane vrednosti. FLAC in WAV sta brezizgubna, M4A je privzeto AAC, pri izklopljeni izbiri pa ALAC.

Enaka končnica ne pomeni, da se izogneš kodiranju. MP4 je vsebnik; njegova vsebina je lahko stisnjena z različnimi kodeki. Menjava vsebnika ob združljivih kodekih lahko samo kopira tok; rez z natančnostjo sličice ali sprememba pikslov običajno zahteva ponovno kodiranje. Hitrost predvajanja ne spreminja hitrosti izvoženega posnetka. Izvoz uporablja izvirnik, ne združljive predogledne kopije. PNG ohrani piksle in prosojnost slike, JPEG je izguben, WebP slike se shranijo brezizgubno. Risbe so trajno vključene v izvoženo datoteko; izvor se ne spreminja.

## Podatki in priprava

`config.json` združuje parametre. `DATA/settings.json` hrani uporabniške nastavitve, `DATA/history.json` odprte/zaprte zavihke, pogled, izrez in risbe, `DATA/recent-folders.json` zadnje izvozne mape. `DATA/cache` hrani indekse dejanskih časovnih oznak sličic in združljive predoglede. Izvoz v `OUTPUT/export_<datum-čas>/parameters.json` zabeleži izvor, vse nastavitve in ukaz FFmpeg; rastrske plasti risb so zraven, `result.json` vsebuje rezultat. Izvoženi posnetek je na izbranem mestu. Testne datoteke in meritve so v mapah `OUTPUT/*_validation_<datum-čas>`.

Projekt je prenosljiv skupaj z mapami `app`, `bin`, `review` in `scripts`. Po premiku ponovno zaženi registracijo in `scripts/create-shortcut.ps1`, saj Windowsove povezave in bližnjice vsebujejo absolutne poti.

**Set default viewer.vbs** registrira 35 bistvenih končnic ter odpre stran aplikacije v Windowsovih nastavitvah. Izbira privzetega programa na trenutnem Windows Pro zahteva sistemski vmesnik; SetUserFTA ne podpira nove zaščite UserChoiceLatest na potrošniških izdajah. Prejšnja trditev o vseh uspešno nastavljenih končnicah je bila napačna: odgovor `AssocQueryString` ni zanesljiv dokaz dejanskega odpiranja. Skripta ne razglaša samodejnega uspeha in ohrani obstoječe ročne izbire. SVG je izključen; odstranili smo tudi njegovo prejšnjo povezavo na ta pregledovalnik. [Microsoft](https://learn.microsoft.com/en-us/windows/apps/develop/windows-integration/default-apps-platform), [SetUserFTA](https://setuserfta.com/faq/).

`scripts/check-shell-open.ps1` dejansko odpre testne datoteke prek Windows ShellExecute in preveri zapis v zgodovini pregledovalnika. V trenutnem preizkusu MKV in OGG delujeta; AVIF odpre izbiro programa in zato še zahteva potrditev v Windowsu. Sam prenosljivi `.exe` je uspešno odprl FFV1 AVI tudi s PATH, omejenim samo na Windows.

Za konkretni preizkus rezervne pretvorbe odpri **Test files/Preizkus prve pretvorbe - FFV1.avi** (720p, 6 sekund; ta datoteka še ni bila odprta v uporabniški aplikaciji). Chromium ne podpira videa FFV1, zato prvič nastane lokalna predogledna kopija s prikazom napredka. **Test files/Preizkus animacije.gif** omogoča preizkus animiranega GIF in njegove časovnice.

Za razvoj je na voljo `setup_and_run.bat`. Preverjanje iz PowerShella:

```powershell
Set-Location -LiteralPath (Join-Path $env:USERPROFILE 'Downloads\Video_Audio_Image_Viewer')
npm.cmd test
npm.cmd run test:app
npm.cmd run test:viewer
npm.cmd run test:formats
npm.cmd run test:refinements
node_modules\electron\dist\electron.exe tests\review-fixes-smoke.js
node_modules\electron\dist\electron.exe tests\review-fixes-smoke.js
node_modules\electron\dist\electron.exe tests\review-fixes-smoke.js
```

Pripravljeni paket je Windows x64. Izvorna aplikacija uporablja Electron/Node in prenosljive API-je; paket za drugi OS je treba sestaviti tam ter dodati ustrezna FFmpeg in FFprobe.

## Odzivnost

Uporabljen je Chromiumov HTML video pogon, kakršen poganja predvajanje v YouTubu v Chromu. Datoteka se bere po potrebnih območjih in ostaja isti odprti predvajalnik pri skokih ter spremembah hitrosti. To je lokalna izvedba podobnega načina predvajanja, ne kopija zasebnega YouTubovega programa. Pri dolgih razmikih med ključnimi sličicami ali nezdružljivem kodeku je še vedno potrebno dekodiranje oziroma prvi lokalni predogled. [FFmpeg](https://ffmpeg.org/ffmpeg.html) opisuje natančno iskanje in kopiranje tokov, [VideoLAN](https://github.com/videolan/vlc/blob/master/doc/clock.md) pa usklajevanje medijske ure. V lokalnem testu H.264 640×360, 24 fps, GOP 10 s je dogodek seeked sledil skoku v približno 55–70 ms. To ni meritev končnega osveževanja zaslona. Skupni delovni pomnilnik procesov v testu je bil približno 600 MB.

## Popravki drugega pregleda

Escape se izvede šele ob izpustu tipke; kombinacija Esc+številka izvede samo izbrani korak. Pri zaporedju se že ničelna rotacija preskoči. R postavi premakljivo modro vrtišče pod kazalec; rotacija ohrani merilo in to točko na zaslonu. Zunaj bounding boxa ostane ozadje črno.

Besedilo se vnaša neposredno v vodoravno škatlo na sliki. Njeno širino spremeniš z modro točko na sredini desnega roba, višina se prilagaja besedilu. B/I vključita krepko/ležeče; Ctrl+Enter ali klik izven škatle zaključi vnos. Radirka ima tanko krožnico in izbirni predogled podlage z gumbom očesa.

Na preglednici gumb Nova opomba ohrani prejšnjo opombo in odpre novo. Besedilo NOVA OPOMBA iz obstoječih zapisov se ob nalaganju razdeli na ločene opombe. Polja se samodejno razširijo. Prilepi screenshot pripravi vrstico za Ctrl+V ali Win+V; ni treba shranjevati datoteke. Nova zahteva je v zgornji vrstici in odpre pojavno okno. Arhivirane zahteve ostanejo arhivirane.

## Tretji pregled

Povečavo lahko zmanjšaš do 5 %, da se vidi tudi celoten bounding box rotirane slike. Ob spremembi hitrosti je obvestilo levo zgoraj.

Risarski meni je ozek: klik ikone razširi možnosti pod izbranim orodjem. Predogled na vrhu sproti prikazuje barvo, debelino in obliko. Poleg polne puščice je na voljo odprta puščica z dvema krakoma. Persistenčna dolžina je dolžina zadnjega dela prostoročne krivulje, čez katero se oceni smer konice; manjši zavoji in tresljaji se izravnajo. Za začetek je nastavljena na 64 izvornih pikslov (16 privzetih debelin črte). Pri lomljenih črtah smer določi zadnji segment. Klik številke na levi ali desni strani drsnika odpre vnos njegovega območja. Nastavitve orodij in območja se ohranijo.

Besedilna škatla ima tesnejši razmik vrstic. Modro točko v desnem zgornjem vogalu lahko med urejanjem primeš in vrtiš škatlo okoli njene sredine. Besedilo se skupaj z odprtimi ali polnimi puščicami vključi v izvoz.

C vklopi ali izklopi podnapise. Najprej se poišče pripadajoč SRT/VTT/ASS/SSA v isti mapi, nato prva vgrajena besedilna sled; če je ni, se odpre izbira datoteke. P vklopi oziroma izklopi predogled prizora ob kazalcu na časovnici. Privzeta velikost je 256 × 144 in je nastavljiva. Predogledi uporabljajo ločen Chromiumov dekoder in predpomnilnik sličic. Pripravljeni prizor se pokaže takoj ob premiku miške, natančnejša sličica pa se po potrebi dekodira v ozadju. Po prvem odprtju se pregledi postopoma pripravijo; začetna priprava in natančnejši preskok sta odvisna od kodeka in razmika med ključnimi sličicami.

Zavihek lahko odneseš iz vrstice v drugo okno. Če pod kazalcem ni drugega okna tega programa, nastane novo okno velikosti izvornega. Pri prenosu se ohranijo obrez, časovni interval, zoom, rotacija, risbe in zgodovina risanja. Datoteke, odprte iz Explorerja, gredo v nazadnje uporabljeno okno. Odprta okna in njihovi zavihki se shranijo za naslednji zagon.

Nova opomba na preglednici ohrani položaj vrstice in ne premakne pogleda na dno strani. Vse obstoječe opombe in arhivirane zahteve ostanejo ohranjene.

## Četrti pregled

Pri vleku zavihka zunaj okna mu sledi vidno predogledno okence. Izvor ostane odprt do zaključenega prenosa. Risarski meni je pod zavihki; predogled debeline, konice in besedila uporablja dejansko merilo posnetka. Odprta puščica ima kraka stalne debeline, smer prostoročne konice pa se prostorsko umirja čez izbrano persistenčno dolžino. Besedilno škatlo vrti zgornja desna točka, širino spreminja enaka točka na sredini desnega roba. Risanje in radirka delujeta tudi po ozadju v vogalih zavrtenega bounding boxa; te risbe sledijo povečavi, premiku, rotaciji in zrcaljenju ter se vključijo v izvoz.

Časovnica in spodnji čas ne prikazujeta tisočink. Oznaki Povečava in Hitrost sta odstranjeni; kratko obvestilo ob spremembi hitrosti ostane levo zgoraj. Nova opomba spreminja samo svojo vrstico, zato ne sesuje višine celotne preglednice ali premakne pogleda na dno.

Izvorna različica za razvoj potrebuje Node.js. Z dvojnim klikom `setup_and_run.bat` se prenese preverjena izdaja FFmpeg, namestijo odvisnosti in sestavi aplikacija. Preneseni ZIP in razširjene odvisnosti ostanejo znotraj projekta. Že sestavljena prenosljiva izdaja ne potrebuje Node.js ali ločenega FFmpeg. `DATA`, `OUTPUT`, lokalne bližnjice in osebni pregledi niso del javnega repozitorija oziroma izdaje.

## Različica 2.4.0

Ctrl+D odpre dve neodvisni, premakljivi okni za risarska orodja in izbiro barve. Menjava orodja posodobi barvno okno, ikone imajo barvo svojega orodja, izbrani gumb pa rahel RGB odtenek. Okni si zapomnita položaj; mere, razponi, predogled in razveljavitve se usklajujejo s posnetkom.

Iztrganje zavihka uporabi vnaprej pripravljeno okno. Izvorno okno takoj pokaže naslednji zavihek; ob prihodu v drugo vrstico se že med držanjem miške prikažeta dejanski zavihek in posnetek. Prazen del vrstice omogoča premikanje okna.

Nova zahteva se takoj shrani brez spremembe prikazanih pikslov ali drsnika. Njena vrstica se pokaže ob naslednjem premiku po seznamu, filtriranju ali osvežitvi. Opombe in pripadajoče slike se ohranijo.

Črta puščice je omejena na natančen obris konice; posneto krivuljo in sprejeti filter smeri ohrani.

## Različica 2.5.0

Iztrgani zavihek ostane med vlečenjem v ospredju; običajno in priključeno premikanje imata enak prag zamenjave soseda.

Risarski okni sta vedno v ospredju in se tesno prilagajata vsebini do največ 1000 px oziroma višine zaslona. Vsak zavihek si zapomni orodje, barvo in mere. Nastavitev »Ohrani ista risarska orodja pri menjavi zavihka ali okna« namesto tega uporabi skupno stanje. Zavihki brez vključenega risanja menija skrijejo.

Krivulje in obe puščici imajo novo nastavitev glajenja celotne poteze; 0 ga izključi. Vrednost je valovna dolžina v izvornih pikslih. Trikotna konica ima dodatno možnost »Smer konice pri osnovnici«. Doslej sprejeti filter za smer konice ostane nespremenjen.

Omejevanje črte pri vrhu puščice je lokalno, zato starejši deli krivulj med risanjem ne izginjajo. Glajenje deluje sproti ter se enako ohrani po izpustu miške in pri izvozu.

## Različica 2.6.0

Ctrl+C kopira sliko z enakim obrezom, rotacijo, zrcaljenjem in risbami kot PNG izvoz ter jo na kratko zeleno obarva. Pri videu in zvoku odložišče ostane nespremenjeno. Ctrl+O ponudi mape in mrežo shranjenih Windowsovih posnetkov zaslona, najnovejše najprej; klik odpre nov zavihek.

Ctrl+Shift+O odpre ločen prikaz za označevanje besedila z lokalnim Windowsovim OCR. Pri videu mora biti predvajanje ustavljeno. OCR uporabi izvirno sliko oziroma izvorno sličico, brez obreza, risb ali sprememb pogleda. Označi del besedila in uporabi Ctrl+C; Escape povrne prejšnji pogled. Uporabljeni so nameščeni Windowsovi jeziki. Drugi operacijski sistemi sporočijo omejitev tega OCR pogona. Obe novi bližnjici lahko preslikaš v nastavitvah.

Tekstovna škatla ima svojo barvo, sredinski ročaj za premikanje in kazalec za širino, ki se vrti skupaj z njo. Risarska menija imata majhen simetričen spodnji rob in popravljene enojne obrobe. Med držanjem zavihka ostaneta vezana nanj; zavihek nima nasprotujoče animacije ali nihanja ob meji. Novo okno se pokaže šele z naloženo vsebino, že znani nespremenjeni posnetki pa se ponovno ne analizirajo.

Pri puščici se omejuje samo zadnji del poti; predhodni obhodi istega območja se ohranijo. Prosojnost se uporabi enkrat na združeni geometriji. Filtra smeri in glajenja ostaneta enaka.

## Različica 2.7.0

Predogled risanja ohrani nastavitve in merilo zavihka med vlečenjem ter se takoj prilagodi velikosti okna. Zakasnjeno shranjevanje risarske palete ne prepiše nove izbire skupnih nastavitev.

Risanje uporablja predpomnilnik končanih potez in osvežuje le prizadeto območje. V lokalnem testu 4K z 80.000 točkami je p95 izrisa padel s 43–101 ms na 8–11 ms; slike in zaključene poteze so po piksljih enake referenčnemu izrisu. Rezultati so odvisni od računalnika in oblike poteze.

Ctrl+O pokaže tudi slike iz trenutnega odložišča ter izloči podvojene posnetke zaslona z enakimi piksli. Ne bere zgodovine odložišča Windows. Premikanje tekstovne škatle ne pušča sledi; kazalca za vrtenje in širino imata usklajen slog in barvo besedila.

OCR poleg izvorne slike obdela do tri lokalna območja s poševnim besedilom in pravilno preslika njihove označbe nazaj na izvorne piksle. Ozadje je nevtralno, urejevalni ročaji so začasno skriti, nedokončano besedilo ostane nedotaknjeno. Prepoznavanje še vedno temelji na lokalnem Windows OCR in nameščenih jezikih.
