# Rezumat — Magistrale

## Temele capitolului
- noțiuni introductive despre magistrale;
- considerente electrice;
- sincronizarea transferurilor;
- magistrale paralele și seriale;
- arbitrajul de magistrală;
- PCI / PCI Express;
- I2C, SPI, USB;
- VME, VXS, VPX.

## 1. Noțiuni de bază
- magistrala este o cale electrică de transmitere a semnalelor între modulele unui sistem;
- într-un sistem pot exista:
  - magistrală sistem;
  - una sau mai multe magistrale de I/E.

### Master și slave
- **master** = poate iniția un transfer;
- **slave** = răspunde la un transfer inițiat de master.

## 2. Considerații electrice
- problemele electrice afectează fiabilitatea și viteza;
- cel mai important fenomen: **reflexiile de semnal**;
- apar din discontinuități de impedanță: conectori, treceri între straturi, încărcări capacitive.

### Terminare de magistrală
- se folosesc **terminatori** pentru reducerea reflexiilor;
- pot fi:
  - pasivi (rezistivi);
  - activi;
  - conectați în serie sau în paralel.

## 3. Sincronizarea transferurilor de date
### Magistrale sincrone
- folosesc un semnal comun de ceas;
- simple conceptual;
- viteza este limitată de dispozitivul cel mai lent.

### Magistrale asincrone
- folosesc semnale de tip cerere / confirmare;
- permit cicluri cu durată variabilă;
- sunt flexibile, dar folosesc mai multe semnale de control.

## 4. Magistrale paralele vs seriale
### Magistrale paralele
- transmit cuvintele pe mai multe linii simultan;
- exemple: PCI, VME;
- au probleme la frecvențe mari din cauza **nesimetriei de propagare**.

### Magistrale seriale
- transmit bit cu bit;
- exemple: PCIe, I2C, SPI, USB;
- avantajele principale:
  - conectori și cabluri mai simple;
  - interferențe mai reduse;
  - sincronizare mai simplă;
  - distanțe mai mari;
  - cost și complexitate mai mici.

## 5. Arbitrajul de magistrală
### Rol
- decide cine devine master când există cereri simultane.

### A. Arbitrare centralizată
- există un arbitru de magistrală;
- variante:
  - conectare în lanț;
  - cereri independente;
  - interogare.

#### Conectarea în lanț
- o singură linie `BUSREQ` și una `BUSGNT`;
- doar două linii de control;
- prioritate fixă, dată de poziția în lanț;
- avantaje: puține linii;
- dezavantaje: prioritate fixă, susceptibilitate la defecte pe `BUSGNT`.

### B. Arbitrare descentralizată
- nu există arbitru central;
- logica este distribuită între dispozitive.

## 6. I2C
- magistrală serială cu două linii:
  - `SDA` — date;
  - `SCL` — ceas.
- fiecare dispozitiv are adresă unică;
- pot exista mai mulți masteri.

### Reguli de bază
- `START`: tranziție `1 → 0` pe `SDA` când `SCL = 1`;
- `STOP`: tranziție `0 → 1` pe `SDA` când `SCL = 1`;
- datele sunt stabile când `SCL = 1`;
- după fiecare octet apare un bit de confirmare.

## 7. SPI
- magistrală serială simplă și rapidă;
- full duplex;
- avantajoasă mai ales pentru sisteme simple și puține dispozitive slave;
- nu folosește adresare ca I2C, ci linii separate de selecție.

## 8. USB
- magistrală serială universală pentru periferice;
- suportă mai multe tipuri de transfer;
- în versiunile moderne oferă viteze mari și suport pentru mai multe protocoale.

## 9. PCI și PCI Express
### PCI
- magistrală paralelă;
- arbitraj separat;
- poate necesita terminații;
- compatibilitate puternică la nivel software.

### PCI Express
- legătură serială, punct-la-punct, bazată pe pachete;
- folosește **lane-uri**;
- lățimea se scalează: x1, x4, x8, x16 etc.;
- niveluri importante: tranzacții, legătură de date, fizic;
- întreruperi moderne prin **MSI**;
- configurare compatibilă cu PCI + spațiu extins PCIe.

## 10. VME, VXS, VPX
### VME
- magistrală paralelă, asincronă;
- folosită în aplicații industriale și embedded;
- fiabilitate ridicată prin construcție mecanică și protocol logic.

### Variante VME
- **VME originală**;
- **VME64 / VME64x** — mai multe facilități și conectori extinși;
- **VME320 / 2eSST** — rate mai mari și topologii îmbunătățite.

### VXS
- combină VME cu legături seriale rapide, comutate;
- conexiuni punct-la-punct prin plăci comutatoare.

### VPX
- orientată spre comunicații seriale rapide și robuste pentru medii dificile.

## Ce să reții pentru examen
- sincron vs asincron;
- paralel vs serial;
- centralizat vs descentralizat la arbitraj;
- START / STOP / ACK la I2C;
- SPI vs I2C;
- PCIe = serial, punct-la-punct, pe pachete;
- diferențele dintre VME, VXS și VPX.

