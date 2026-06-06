# Răspunsuri la Întrebări Deschise SIE
> **Surse**: exclusiv cursurile PDF din folder (1–10 SIE-*.pdf)  
> ⚠️ Întrebările marcate cu **[CURS INDISPONIBIL]** acoperă capitole (IPS, OLED, Puncte Cuantice, Hârtie Electronică, Adaptoare Grafice, Discuri Optice) ale căror PDF-uri **nu se află în folder**.

---

## 1. Frecvența semnalului de ceas: magistrală paralelă vs. serială
*(Sursă: 5 SIE-Magistrale-2.pdf, p. 2)*

La magistralele paralele, creșterea frecvenței semnalului de ceas este dificilă din cauza **nesimetriei de propagare** — diferența dintre întârzierile de propagare a semnalelor pe linii diferite. Cu cât frecvența crește, cu atât această diferență de fază determină coruperea datelor, deoarece biții unui cuvânt nu mai sosesc simultan la destinație.

La magistralele seriale, informațiile de sincronizare pot fi **înglobate direct în șirul de biți serial** (ex. codificare 8b/10b, 128b/130b), eliminând necesitatea sincronizării simultane a mai multor fire și permițând frecvențe mult mai ridicate.

---

## 2. Diagrama de timp — transfer inițiat de destinație, protocol unidirecțional
*(Sursă: 4 SIE-Magistrale-1.pdf, p. 20–22)*

Semnalul utilizat: **DREQ** (Data Request).

1. **Destinația** activează semnalul DREQ, indicând că este pregătită să primească date.
2. **Sursa** detectează DREQ activ, plasează datele pe magistrală și le menține stabile.
3. **Destinația** prepară intrările și preia datele de pe magistrală (DREQ rămâne activ pe durata transferului sau servește drept strob de încărcare).
4. **Destinația** dezactivează DREQ după preluarea datelor.

> **Dezavantaj**: sursa nu are confirmarea că destinația a recepționat corect datele (nu există semnal ACK).

---

## 3. Diagrama de timp — operație de scriere pe magistrală sincronă
*(Sursă: 4 SIE-Magistrale-1.pdf, p. 14–17)*

1. La **frontul crescător** al ceasului, **masterul** plasează adresa pe liniile de adrese și activează semnalul de scriere (WR).
2. Mastrul plasează **datele** pe magistrală (în același ciclu sau în ciclul următor, conform specificației).
3. La **frontul ceasului** următor, **slave-ul** eșantionează datele și le memorează.
4. Dacă slave-ul nu poate finaliza operația la timp, activează semnalul **WAIT** (sau nu activează ACK) → masterul introduce **stări de așteptare** și menține datele pe magistrală.
5. Masterul dezactivează WR și eliberează liniile la terminarea ciclului.

> **Dezavantaj**: dacă un transfer se termină înainte de un număr întreg de cicli de ceas, trebuie așteptat sfârşitul ciclului; viteza se alege după dispozitivul cel mai lent.

---

## 4. Arbitraj centralizat prin conectarea în lanț (daisy chaining)
*(Sursă: 5 SIE-Magistrale-2.pdf, p. 8–12)*  
*(Același răspuns este valabil și pentru întrebările 19 și 26)*

Schema utilizează **două linii de control**:
- **BUSREQ** (Bus Request) — SAU cablat, toate dispozitivele o pot activa simultan;
- **BUSGNT** (Bus Grant) — linie de acordare, înlănțuită fizic prin toate dispozitivele.

Funcționare:
1. Un dispozitiv care dorește accesul activează **BUSREQ**.
2. Arbitrul (central) detectează BUSREQ și activează **BUSGNT**.
3. BUSGNT se propagă de la primul dispozitiv spre celelalte.
4. Primul dispozitiv care **a solicitat** magistrala interceptează BUSGNT (nu îl propagă mai departe), obţine controlul magistralei şi activează **BUSY**.
5. Un dispozitiv care **nu a solicitat** lasă BUSGNT să continue spre el.

**Prioritatea** este determinată de poziția fizică: dispozitivul cel mai apropiat de arbitru are prioritatea maximă.

**Avantaje**: număr redus de linii de control; poate conecta teoretic orice număr de dispozitive.  
**Dezavantaje**: priorități fixe; un dispozitiv cu prioritate înaltă poate bloca celelalte; susceptibil la defecte pe linia BUSGNT.

---

## 5. Transfer inițiat de sursă — protocol bidirecțional
*(Sursă: 4 SIE-Magistrale-1.pdf, p. 24–25)*  
*(Parte din răspunsul la întrebarea 28)*

1. **Sursa** plasează datele pe magistrală şi activează semnalul **DREADY** (Data Ready).
2. **Destinația** detectează DREADY activ, preia datele şi activează semnalul de confirmare **ACK** (Acknowledge).
3. **Sursa** detectează ACK activ, dezactivează DREADY şi retrage datele de pe magistrală (confirmarea recepţiei cu succes).
4. **Destinația** detectează dezactivarea DREADY şi dezactivează ACK.

---

## 6. Transfer inițiat de destinație — protocol bidirecțional
*(Sursă: 4 SIE-Magistrale-1.pdf, p. 24–26)*  
*(Parte din răspunsul la întrebarea 28)*

1. **Destinația** activează semnalul **DREQ**, indicând că este pregătită să primească date.
2. **Sursa** detectează DREQ, plasează datele pe magistrală şi activează **ACK**.
3. **Destinația** preia datele şi dezactivează **DREQ**.
4. **Sursa** detectează dezactivarea DREQ, dezactivează **ACK** şi retrage datele de pe magistrală.

---

## 7. Arbitrajul descentralizat cu 3 linii
*(Sursă: 5 SIE-Magistrale-2.pdf, p. 17–20)*  
*(Același răspuns pentru întrebările 20 şi 27)*

Schema foloseşte **3 linii**:
- **BUSREQ** — SAU cablat, orice dispozitiv o poate activa;
- **BUSY** — activată de dispozitivul care controlează magistrala;
- **Linie de arbitrare** — conectată în lanț prin toate dispozitivele (similar cu BUSGNT, dar fără arbitru central).

Funcționare:
1. Un dispozitiv care dorește accesul activează **BUSREQ**.
2. Dacă **BUSY** este inactiv, semnalul de arbitrare se propagă prin lanț.
3. Primul dispozitiv din lanț care **a solicitat** magistrala interceptează semnalul de arbitrare, devine master şi activează **BUSY**.
4. La terminarea utilizării, masterul dezactivează BUSY.

**Avantaje față de centralizat**: cost mai redus, viteză mai ridicată, nu este susceptibilă la defectele unui arbitru central.

---

## 8. Rolul zonei de comunicare dintre CPU și procesorul de I/E (PIE)
*(Sursă: 3 SIE-Metode-IE-2.pdf, p. 28–31)*

**Zona de comunicare** este o regiune din **memoria principală** prin care UCP şi PIE (procesorul de I/E) fac schimb de date şi comenzi fără a bloca reciproc magistrala. UCP scrie în această zonă **comenzile şi parametrii** operaţiilor de I/E pe care PIE trebuie să le execute (programul de canal), iar PIE scrie **rezultatele şi starea** operaţiilor executate.

Pe lângă zona de memorie, comunicaţia se realizează şi prin semnale directe de control: UCP atenţionează PIE prin semnalul **ATN** (Attention) că a scris date noi în zona de comunicare, iar PIE atenţionează UCP prin **IREQ** (Interrupt Request) la terminarea secvenţei de operaţii de I/E.

---

## 9. Metoda „furt de ciclu" pentru DMA
*(Sursă: 3 SIE-Metode-IE-2.pdf, p. 14–15)*

Prin metoda **„furt de ciclu"** (cycle stealing), controlerul DMA transferă **câte un cuvânt** (sau un număr mic de cuvinte) de date în intervalele de timp în care UCP nu accesează memoria (nu efectuează accese la magistrală). Blocurile lungi de date sunt transferate printr-o **secvenţă de tranzacţii DMA intercalate** cu tranzacţiile UCP, astfel UCP suferă o suspendare minimă şi poate continua execuţia programului în paralel.

Metoda reduce rata maximă de transfer (faţă de metoda „în rafală"), dar minimizează interferenţa controlerului DMA cu activitatea UCP şi accesul acesteia la memorie.

---

## 10. Trei îmbunătățiri introduse de PCI Express față de PCI precedente
*(Sursă: 5 SIE-Magistrale-2.pdf, p. 38–54)*

1. **Conexiune serială punct-la-punct** — elimină dezavantajele magistralei paralele (nesimetrie de propagare, dificultatea sincronizării), permiţând frecvenţe de operare mult mai ridicate (2,5 → 64 GT/s în funcţie de generaţie).

2. **Performanţă scalabilă** — lăţimea legăturii este variabilă (x1, x4, x8, x16 benzi de comunicaţie), setată automat, adaptând performanţa la cerinţele fiecărui dispozitiv.

3. **Protocol bazat pe pachete cu facilităţi avansate** — include calitate a serviciilor (QoS), gestiune avansată a puterii consumate şi a erorilor, tranzacţii de tip split (similare PCI-X) şi posibilitatea conectării/deconectării perifericelor în timpul funcţionării (hot-plug).

> *Alte îmbunătăţiri menţionate în curs: model software compatibil cu PCI; suport MSI (Message Signaled Interrupts); codificare 128b/130b din Gen 3.*

---

## 11. Caracteristicile magistralei VXS (VMEbus Switched Serial)
*(Sursă: 7 SIE-Magistrale-4.pdf, p. 13–15)*

- **VXS** combină magistrala VME paralelă cu **conexiuni seriale comutatoare de viteză ridicată**.
- Standarde ANSI/VITA 41.x (InfiniBand, Serial RapidIO, Gigabit Ethernet, PCI Express ×4).
- Interconexiune serială comutată cu **conexiuni punct-la-punct** între module; semnalele de ceas şi date sunt combinate într-un şir de biţi serial.
- **Rate de date**: 3,125 sau 6,25 Gbiţi/s; cu codificare 8b/10b → 312,5 sau 625 MB/s; cu codificare 64b/66b → 378 sau 756 MB/s.
- **Plăci comutatoare** (1–2): conţin un comutator; **plăci normale** (până la 18): se conectează la plăcile comutatoare.
- Topologii de baze de bord: **stea simplă, stea duală, plasă, lanţ**.

---

## 12. Arhitectura unui sistem CompactPCI
*(Sursă: 8 SIE-Module-Extensie.pdf, p. 22–30)*

- **CompactPCI** (cPCI) combină specificaţiile electrice ale magistralei **PCI paralele de 32 sau 64 biţi** cu formatele de placă **Eurocard 3U şi 6U**.
- Are o **placă de bază pasivă** (numai conectori, fără componente active) → întreţinere simplă, fiabilitate ridicată.
- **Conectori**: HM (Hard Metric), pas 2 mm; module 3U au J1 (32 biţi) şi opţional J2 (64 biţi sau pini de I/O); module 6U au J1–J5; placa de bază are P1–P2 (3U) sau P1–P5 (6U).
- Suportă **până la 8 socluri** periferice per segment de magistrală.
- Extensii: **Hot Swap** (PICMG 2.1 — inserare la cald), **Ethernet** (PICMG 2.16 — reţea locală între module, max. 2 Gbiţi/s per soclu).
- **Avantaje**: modularitate, robusteţe, scalabilitate, independenţă faţă de procesor, cost redus al circuitelor PCI/PCIe.

---

## 13. Arhitectura unui sistem CompactPCI Serial
*(Sursă: 8 SIE-Module-Extensie.pdf, p. 40–44)*

- **CompactPCI Serial** (PICMG CPCI-S.0) **înlocuieşte complet** magistrala PCI paralelă cu **interconexiuni seriale rapide**.
- Conectorii HM originali sunt înlocuiţi cu conectori **AirMax** (rate de 12 Gbiţi/s; până la 184 perechi pe modul 3U).
- Formate **Eurocard 3U şi 6U**, cu răcire prin convecţie sau conducţie; **placă de bază complet pasivă**.
- Module 3U: până la **6 conectori** (P1–P6); module 6U: până la **7 conectori** (P0–P6); P2–P6 au 360 pini de I/O definiţi de utilizator.
- **Interfaţe suportate** per soclu periferic: o legătură PCIe (×8), SATA/SAS, USB 2.0, USB 3.0, până la 8 interfeţe Ethernet.
- Permite **înlocuirea modulelor în timpul funcţionării** (hot-swap).

---

## 14. Caracteristicile versiunii 4 a magistralei USB (USB4)
*(Sursă: 6 SIE-Magistrale-3.pdf, p. 47–48)*

- **USB4** (2019) se bazează pe protocolul **Thunderbolt 3**.
- **Versiunea 1.0**: până la **40 Gbiţi/s**; **versiunea 2.0**: până la **80 Gbiţi/s**.
- Permite **protocoale multiple simultane** pentru date şi afişaje: USB 3.x SuperSpeed, PCI Express, DisplayPort.
- Se pot aloca pachete dedicate pentru **conexiuni de date directe** între echipamente gazdă.
- Utilizează conectorul **de tip C reversibil** şi codificarea **128b/132b**.
- **Compatibil** cu USB 3.1, 3.0 şi 2.0.

---

## 15. Adresare cu mapare în memorie vs. adresare izolată (2 criterii)
*(Sursă: 2 SIE-Metode-IE-1.pdf, p. 7–11)*

| Criteriu | Mapare în memorie | Adresare izolată |
|---|---|---|
| **Spaţiul de adrese** | Un singur spaţiu de adrese pentru memorie şi dispozitivele de I/O; registrele modulelor de I/O ocupă locaţii din spaţiul memoriei | Spaţiu de adrese de I/O **separat** de cel al memoriei; magistrala necesită linii suplimentare (IORD, IOWR, MRD, MWR) |
| **Instrucţiunile utilizate** | Se utilizează **aceleaşi instrucţiuni** pentru accesul la memorie şi la dispozitivele de I/O (LD, ST — nu sunt necesare instrucţiuni speciale de I/O) | UCP trebuie să execute **instrucţiuni separate de I/O** (IN, OUT la Intel) care activează linii de control diferite faţă de accesele la memorie |

---

## 16. Comparaţie „furt de ciclu" vs. „în rafală" pentru DMA (2 criterii)
*(Sursă: 3 SIE-Metode-IE-2.pdf, p. 13–15)*

| Criteriu | Furt de ciclu | În rafală (pe blocuri) |
|---|---|---|
| **Interferenţa cu UCP** | Minimă — DMA fură câte un ciclu în intervalele libere ale UCP; UCP continuă execuţia programului în paralel | Maximă — UCP este **complet suspendată** pe toată durata transferului blocului; magistrala trece în stare de înaltă impedanţă |
| **Rata de transfer şi necesitate** | Rată mai mică (transfer fragmentat intercalat cu ciclurile UCP) | Rată maximă posibilă; **obligatorie** pentru dispozitive (ex. unităţi de disc) al căror transfer nu poate fi oprit sau încetinit |

---

## 17. Operaţiile executate de UCP pentru transferul controlului la subrutina de tratare a întreruperii
*(Sursă: 2 SIE-Metode-IE-1.pdf, p. 25–27)*

1. **Termină execuţia instrucţiunii curente** (suspendarea are loc între instrucţiuni, nu în mijlocul uneia).
2. **Activează semnalul IACK** (Interrupt Acknowledge), confirmând recunoaşterea cererii.
3. **Identifică sursa întreruperii** (prin linie dedicată, interogare software/hardware sau vector furnizat de sursă).
4. **Determină adresa subrutinei de tratare**:
   - *Ntreruperi ne-vectorizate*: adresă fixă prestabilită în memorie;
   - *Ntreruperi vectorizate*: adresa este furnizată de sursa de întrerupere sub forma unui **vector de întrerupere**.
5. **Salvează contorul de program (PC)** şi alte informaţii de stare (registre flags, eventual alţi registri) — de obicei pe stivă.
6. **Încarcă adresa subrutinei de tratare în PC**, transferând astfel controlul execuţiei la subrutină.

---

## 18. Diagrama de timp — operaţie de citire pe magistrală paralelă sincronă
*(Sursă: 4 SIE-Magistrale-1.pdf, p. 14–17)*

1. La **frontul semnalului de ceas**, **masterul** plasează **adresa** pe liniile de adrese şi activează semnalul de citire **RD**.
2. **Slave-ul** decodifică adresa, preia controlul liniilor de date şi plasează **datele** pe magistrală (în intervalul de timp specificat).
3. La **frontul următor al ceasului**, masterul **eşantionează datele** de pe magistrală (şi le stochează intern).
4. Masterul dezactivează **RD** şi eliberează magistrala.
5. Dacă slave-ul nu poate furniza datele la timp, activează **WAIT** (sau nu activează ACK) → masterul introduce **stări de aşteptare** (hold cycles) şi amână eşantionarea.

---

## 21. Conectarea în serie a liniilor de întrerupere
*(Sursă: 3 SIE-Metode-IE-2.pdf, p. 8–10)*

Dispozitivele sunt conectate în **lanţ (daisy chain)**, fiecare cu o intrare **PI** (Priority In) şi o ieşire **PO** (Priority Out). Linia de cerere IREQ este **comună** pentru toate (SAU cablat). Dispozitivul cu **prioritatea maximă** este plasat primul în lanţ.

Funcţionare:
1. Un dispozitiv activează **IREQ**; UCP detectează cererea şi activează **IACK**.
2. Semnalul IACK se propagă de la primul dispozitiv (prin PI → PO) spre celelalte.
3. Primul dispozitiv care **a solicitat** întreruperea **interceptează IACK** (nu îl propagă la PO) şi plasează **vectorul de întrerupere** pe magistrala de date.
4. UCP foloseşte vectorul pentru a sări la subrutina de tratare corespunzătoare.
5. Un dispozitiv care **nu a solicitat** lasă semnalul IACK să continue (PI → PO).

---

## 22. Componentele unui controler DMA necesare pentru execuţia unui transfer
*(Sursă: 3 SIE-Metode-IE-2.pdf, p. 17–22)*

| Componentă | Funcţie |
|---|---|
| **Registrul de adresă I/O (IOAR)** | Memorează adresa dispozitivului de I/O implicat în transfer; se transmite de UCP la iniţializare |
| **Contorul de date (DC)** | Memorează numărul de octeţi/cuvinte rămase de transferat; se decrementează după fiecare ciclu DMA; când DC = 0, transferul s-a terminat |
| **Registrul de adresă memorie** | Memorează adresa curentă din memoria principală de la/la care se transferă date; se incrementează după fiecare ciclu pentru a adresa locaţia următoare |
| **Logica de control** | Generează semnalele **DMAREQ** (cerere de magistrală) şi recepţionează **DMAACK** (acordare magistrală); coordonează transferul şi generează o **cerere de ntrerupere** (IREQ) la terminare |
| **Registrul de stare/comandă** | Memorează direcţia transferului (citire/scriere), starea operaţiei şi parametrii primiţi de la UCP în secvenţa de iniţializare |

---

## 23. Deosebirile dintre VME320 şi VME64x
*(Sursă: 7 SIE-Magistrale-4.pdf, p. 9–12)*

| Aspect | VME64x | VME320 (VME 2eSST) |
|---|---|---|
| **Rată de transfer** | Max. **160 MB/s** (protocol 2eVME — Double-edge VME) | **> 320 MB/s** (vârf > 500 MB/s), protocol **2eSST** (Double-edge Source Synchronous Transfer) |
| **Topologie interconectare** | Magistrală partajată convenţională | **Conexiune în stea**: toţi conectorii legaţi la conectorul din mijlocul plăcii de bază |
| **Protocol de date** | Protocol 2eVME | Protocol **2eSST** — sincron la sursă în fazele de date |
| **Conectori** | 5 rânduri × 32 pini (160 pini) + conector suplimentar 95 pini | Aceeaşi bază mecanică VME64x; modificare de protocol şi topologie |
| **Alte caracteristici VME64x** | Pini alimentare 3,3 V; 141 pini I/O utilizator; inserare în funcţionare; panouri frontale cu pini de ghidare | — |

---

## 24. Îmbunătăţirile introduse de USB 3.1 şi USB 3.2
*(Sursă: 6 SIE-Magistrale-3.pdf, p. 43–48)*

**USB 3.1**:
- Introduce codificarea **128b/132b** (în locul 8b/10b din USB 3.0), reducând overheadul de codificare.
- Atinge modul **SuperSpeed+ USB 10 Gbps** (10 Gbiţi/s pe un singur canal).

**USB 3.2**:
- Adaugă suportul pentru modul **SuperSpeed+ USB 20 Gbps** prin utilizarea a **două canale de date simultane** pe conectorul de tip C reversibil.
- Defineşte variante: **Gen 1×1** (5 Gbiţi/s), **Gen 1×2** (10 Gbiţi/s), **Gen 2×1** (10 Gbiţi/s), **Gen 2×2** (20 Gbiţi/s).
- Exploatează **reversibilitatea conectorului de tip C**; foloseşte aceeaşi codificare 128b/132b ca USB 3.1.

---

## 25. Rolul terminatorului de magistrală şi tipuri de conexiune
*(Sursă: 4 SIE-Magistrale-1.pdf, p. 6–9)*

**Rolul**: terminatorul elimină sau reduce **reflexiile de semnal** cauzate de discontinuităţile de impedanţă (conectori, sarcini capacitive, treceri între straturi). Fără terminator, reflexiile produc oscilaţii ale tensiunii şi curentului care reduc fiabilitatea transferurilor.

**Terminator rezistiv serie**:
- Se conectează **în serie** cu linia, la capătul transmisiei (lângă driver).
- Condiţia ideală: **R_s + Z_s = Z_0** (Rs — rezistenţa serie, Zs — impedanţa sursei, Z0 — impedanţa caracteristică a liniei).
- Absoarbe unda reflectată la recepţie la nivel de sursă.

**Terminator rezistiv paralel**:
- Se conectează **în paralel** la capătul receptor, formând un **divizor de tensiune**.
- Rezistenţa echivalentă trebuie să fie egală cu Z0.
- Poate fi utilizat pentru **magistrale bidirecţionale**.

---

## 28. Transferul prin protocol bidirecţional (ambele variante)
*(Sursă: 4 SIE-Magistrale-1.pdf, p. 24–26)*

**a) Inițiat de sursă** *(vezi şi răspunsul 5)*:
1. Sursa plasează datele şi activează **DREADY**.
2. Destinaţia preia datele şi activează **ACK**.
3. Sursa dezactivează DREADY (confirmarea recepţiei).
4. Destinaţia dezactivează ACK.

**b) Inițiat de destinaţie** *(vezi şi răspunsul 6)*:
1. Destinaţia activează **DREQ**.
2. Sursa plasează datele şi activează **ACK**.
3. Destinaţia preia datele şi dezactivează DREQ.
4. Sursa dezactivează ACK şi retrage datele.

---

## 29. Deosebirea topologiilor „stea simplă" vs. „stea duală" VXS
*(Sursă: 8 SIE-Module-Extensie.pdf, p. 13–14)*

**Stea simplă**: fiecare placă normală se conectează la **o singură placă comutatoare**. Există o singură cale de comunicaţie, care poate deveni un punct unic de defecţiune.

**Stea duală**: fiecare placă normală se conectează la **ambele plăci comutatoare**. Aceasta asigură **redundanţă** — dacă una dintre plăcile comutatoare defectează, comunicaţia continuă prin cealaltă, crescând fiabilitatea sistemului. Este preferată în aplicaţii critice (militare, aerospaţiale).

---

## 30. Avantajele utilizării modulelor COM Express
*(Sursă: 8 SIE-Module-Extensie.pdf, p. 64–71)*

1. **Performanţe ridicate** — datorită magistralelor şi interfeţelor seriale cu viteze ridicate (PCIe, USB, SATA, Ethernet, afişaj).
2. **Flexibilitate** — disponibile în dimensiuni multiple (Mini 84×55 mm, Compact 95×95 mm, Basic 125×95 mm, Extended 155×110 mm) şi tipuri variate de configuraţii ale pinilor (tipuri 1, 2, 3, 4, 5, 6, 7, 10).
3. **Versatilitate de utilizare** — pot fi folosite atât independent (calculator pe o singură placă) cât şi ca modul mezanin procesor conectat la o placă purtătoare a utilizatorului.
4. **Cost şi timp de dezvoltare reduse** — utilizatorul proiectează numai placa purtătoare cu I/O specific aplicaţiei.
5. **Actualizări simple** — la o nouă generaţie de procesor, se înlocuieşte doar modulul COM Express, placa purtătoare rămânând neschimbată.

---

## 31. Comparaţie MVA vs. TN (3 criterii)
*(Sursă: 10 SIE-Afisaje-2.pdf, p. 55–66)*

| Criteriu | TN (Twisted Nematic) | MVA (Multi-Domain Vertical Alignment) |
|---|---|---|
| **Contrast** | < 1000:1; blocarea luminii incompletă în starea inactivă | Contrast **îmbunătăţit** (blocarea aprox. completă — moleculele perpendiculare pe plăci în starea inactivă → negru mai profund) |
| **Unghi de vizualizare** | **Redus**, mai ales pe verticală; luminozitatea variază semnificativ cu unghiul | **Mult mai mare** (ex. 160° pe orizontală şi verticală), datorită împărţirii celulei în domenii cu molecule orientate în direcţii diferite |
| **Reproducerea culorilor** | Numai 64 orientări posibile → 6 biţi/sub-pixel; necesită tehnici FRC sau dithering pentru 16 milioane culori | Permite culoare de **24 biţi** fără tehnici speciale; reproducere îmbunătăţită, dar problemă într-o direcţie strict perpendiculară |

---

## 36. Trei avantaje ale afişajelor cu matrice activă faţă de cele cu matrice pasivă
*(Sursă: 10 SIE-Afisaje-2.pdf, p. 11–17)*

1. **Timp de răspuns mai redus** — tranzistorul TFT asociat fiecărui pixel menţine tensiunea în condensatorul pixelului între ciclurile de baleiere, eliminând inerţia din matricea pasivă.
2. **Contrast mai ridicat** — fiecare pixel este controlat individual de un tranzistor; nu există efect „crosstalk" (interferenţa între pixeli vecini) prezent la matricea pasivă.
3. **Nivel de strălucire mai ridicat şi unghi de vizualizare mai mare** — controlul precis al tensiunii pe fiecare pixel permite o modulare fină a luminozităţii.

> *Dezavantaje matrice activă: necesită lumină de fond mai puternică şi are cost mai ridicat.*

---

## 37 / 38. Principiul MVA şi avantajele faţă de VA; deosebirile MVA vs. VA
*(Sursă: 10 SIE-Afisaje-2.pdf, p. 55–66)*

**Tehnologia VA**: moleculele sunt aliniate **perpendicular pe plăcile de sticlă** în absenţa tensiunii → blocarea luminii aproape completă (negru de calitate). La aplicarea tensiunii, moleculele se înclină cu până la 90°, permiţând trecerea luminii. **Problema**: moleculele se înclină toate în aceeaşi direcţie → luminozitatea celulei variază puternic cu unghiul de vizualizare (din direcţia de înclinare celula este luminoasă, din direcţia perpendiculară — întunecată).

**Tehnologia MVA**: fiecare celulă este **împărţită în 2+ domenii** (prin protuberanţe piramidale sau electrozi în zigzag), în care moleculele se înclină în **direcţii diferite** la aplicarea tensiunii. Combinarea domeniilor cu orientări opuse produce o luminozitate mai **uniformă** indiferent de unghiul de vizualizare.

**Deosebiri cheie**:
| | VA | MVA |
|---|---|---|
| Domenii per celulă | 1 (o singură direcţie de înclinare) | ≥ 2 (domenii cu orientări diferite) |
| Unghi de vizualizare | Limitat | Mult mai mare (ex. 160° pe ambele axe) |
| Uniformitatea luminozităţii | Dependentă de unghiul de vizualizare | Îmbunătăţită semnificativ |

---

## 42. Trei avantaje ale luminii de fond cu LED faţă de CCFL
*(Sursă: 9 SIE-Afisaje-1.pdf, p. 36–38)*

1. **Consum de energie redus** cu 35–40% faţă de lămpile fluorescente.
2. **Durata de viaţă mai lungă** a diodelor LED faţă de lămpile CCFL.
3. **Afişaje cu grosime redusă** (< 1 cm grosime), contrast şi luminozitate mai ridicate.

> *Alte avantaje din curs: posibilitatea tehnicii Local Dimming (control individual al intensităţii pe zone).*

---

## 49. Structura unui afişaj color cu cristale lichide TN
*(Sursă: 9 SIE-Afisaje-1.pdf, p. 13–21)*

Structura (de la sursa de lumină spre utilizator):
1. **Sursă de lumină de fond** (CCFL sau LED)
2. **Polarizator liniar** (primul filtru de polarizare)
3. **Placă de sticlă** cu electrozi transparenți şi strat de aliniere pe prima placă
4. **Strat de cristale lichide TN** — moleculele răsucite cu 90° în starea inactivă
5. **Filtru color** — fiecare pixel are 3 sub-pixeli cu filtre R, G, B
6. **Placă de sticlă** cu electrozi transparenți şi strat de aliniere pe a doua placă (caneluri perpendiculare faţă de prima placă)
7. **Polarizator liniar** (al doilea, perpendicular pe primul)

**Funcţionare color**: la fiecare sub-pixel se aplică o tensiune care controlează gradul de rotire a polarizării → cantitatea de lumină care trece prin filtrul de culoare corespunzător. Combinând cele 3 sub-pixeli se obţin toate culorile prin **sinteză aditivă** (R+G+B = alb).

---

## 51. Principiul PVA şi Super-PVA
*(Sursă: 10 SIE-Afisaje-2.pdf, p. 67–71)*

**PVA (Patterned Vertical Alignment)** — dezvoltat de Samsung. Protuberanţele de pe ambele substraturi (din MVA) sunt **înlocuite cu electrozi în formă de zigzag**. Celula PVA în stare inactivă: molecule perpendiculare pe plăci; la aplicarea tensiunii, electrozii în zigzag creează câmpuri oblice care determină înclinarea moleculelor în **domenii cu orientări diferite**.
- Contrast: îmbunătăţit până la **3000:1**; timp de răspuns similar cu MVA; calitate a culorilor cu probleme pentru direcţia perpendiculară.

**S-PVA (Super-PVA)**:
- **Timp de răspuns îmbunătăţit** printr-o metodă RTC avansată (Dynamic Capacitance Compensation) — ex. de la 50 ms la 8 ms.
- **Nu utilizează tehnici de simulare a culorilor** → culori de **24 biţi** sau 30 biţi.
- Structura sub-pixelilor modificată: **două secţiuni** aliniate în direcţii opuse, care pot compensa deplasarea culorilor la unghiuri de vizualizare mai mari.

---

---

# ⚠️ ÎNTREBĂRI FĂRĂ RĂSPUNS — Capitole indisponibile în folder

Cursurile PDF pentru următoarele teme **nu se află în folder**. Nu pot răspunde exclusiv din materialele disponibile.

| Întrebare | Temă lipsă |
|---|---|
| Modulare interferometrică (hârtie electronică) | Afişaje cu hârtie electronică |
| Cavitate optică interferometrică | Afişaje cu hârtie electronică |
| Quantum Dot Enhancement Film (QDEF) | Afişaje cu puncte cuantice |
| Tehnologia IPS (In-Plane Switching) | IPS — slides nepostate încă în PDF 10 |
| Super IPS | IPS |
| OLED avantaje / AMOLED vs. PMOLED | Afişaje cu diode organice (OLED) |
| OLED fluorescent vs. fosforescent | OLED |
| OLED cu emisie directă vs. lumină albă | OLED |
| Structura QDCC (Quantum Dot Color Conversion) | Puncte cuantice |
| Puncte cuantice electro-luminiscente | Puncte cuantice |
| QDCC îmbunătăţeşte calitatea culorilor la LCD | Puncte cuantice |
| Hârtie electronică — micro-capsule electroforetice | Hârtie electronică |
| Hârtie electronică — micro-cuve electroforetice | Hârtie electronică |
| GPU arhitectură vs. UCP | Adaptoare grafice (PDF lipsă) |
| Embedded DisplayPort / auto-reîmprospătare panel | Adaptoare grafice |
| CUDA vs. API grafică | Adaptoare grafice |
| GPU dedicate vs. integrate | Adaptoare grafice |
| Canalul auxiliar DisplayPort | Adaptoare grafice |
| Ierarhia memoriei CUDA | Adaptoare grafice |
| Trei caracteristici CUDA | Adaptoare grafice |
| Legătură TMDS HDMI | Adaptoare grafice |
| Biţi consecutivi la înregistrare disc optic | Discuri optice (PDF lipsă) |
| Canelura spiralată DVD+R | Discuri optice |
| Canelura spiralată DVD-R | Discuri optice |
| Tehnici Blu-ray pentru capacitate mai mare faţă de DVD | Discuri optice |
| Ansamblu optic de citire | Discuri optice |
| CD-RW — procese scriere şi ştergere | Discuri optice |
| DVD vs. CD — tehnici creştere capacitate | Discuri optice |

