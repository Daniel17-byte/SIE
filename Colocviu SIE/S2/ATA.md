# Lab 7 — Interfața ATA

## Scop
- Înțelegerea interfeței ATA pentru discuri și a evoluției către SATA.
- Folosirea registrelor și a comenzilor de bază pentru identificarea și interogarea unităților.

## Esențial
- **ATA** este interfața clasică paralelă de **16 biți** pentru discuri.
- Varianta modernă este **SATA** — serială, introdusă ulterior.
- Două unități pot împărți același canal ATA:
  - **master**
  - **slave**

## Evoluție pe scurt
- **ATA (ATA-1)**: moduri PIO 0..2, DMA simplu, adresare CHS.
- **ATA-2**: PIO 3/4, DMA mai rapid, **LBA**.
- **ATA-3**: introduce **S.M.A.R.T.** și face LBA obligatoriu.
- **ATA/ATAPI-4**: ATAPI + **Ultra DMA**.
- Versiunile următoare cresc viteza și îmbunătățesc cablurile/protocoalele.

## Adresarea sectoarelor
### CHS
- Sectorul este identificat prin:
  - **Cylinder**
  - **Head**
  - **Sector**
- Este metoda veche.

### LBA
- Fiecare sector primește o adresă logică unică.
- Este metoda modernă și obligatorie în versiunile noi.
- Există LBA pe **28 biți** și pe **48 biți**.
- Pentru capacități mari contează LBA pe **48 biți**.

## Moduri de transfer
### PIO
- Procesorul participă direct la fiecare transfer.
- Mai simplu, dar mai lent.
- Moduri importante:
  - **PIO 0** ≈ 3.33 MB/s
  - **PIO 4** ≈ 16.67 MB/s
- Modurile PIO 3 și 4 folosesc semnalul **IORDY**.

### DMA
- Transfer direct între unitate și memorie.
- CPU este mai puțin încărcat.
- Variante:
  - DMA de un singur cuvânt — vechi
  - **Multiword DMA**
  - **Ultra DMA (UDMA)** — mult mai rapid
- UDMA introduce și verificare **CRC**.

## SATA — ideea principală
- SATA înlocuiește magistrala paralelă ATA cu legătură serială.
- Avantaje:
  - cabluri mai simple
  - semnalizare mai robustă
  - viteze mai mari
- Clase importante:
  - **SATA-150**
  - **SATA-300**
  - **SATA-600**

## Registre ATA/ATAPI importante
### Blocul de comandă
- **Data** — transferul efectiv de date.
- **Error** / **Features** — erori sau parametri ai comenzii.
- **Sector Count** — număr de sectoare.
- **LBA Low / Mid / High** — adresa sectorului.
- **Device** — selectează unitatea și modul LBA.
- **Status** / **Command** — stare și lansare comandă.

### Blocul de control
- **Alternate Status** — stare fără a șterge întreruperea.
- **Device Control** — control/reset/HOB.

## Biți foarte importanți din `Status`
- **BSY** — unitatea e ocupată.
- **DRDY** — unitatea acceptă comenzi.
- **DF** — defect de dispozitiv.
- **DRQ** — unitatea e gata de transfer de date.
- **ERR** — a apărut o eroare.

## Alte idei importante
- `Error` indică motivul erorii; bitul esențial este **ABRT** = comandă abandonată.
- În LBA pe 48 biți, unele registre funcționează ca FIFO pe 2 octeți.
- Bitul **HOB** din `Device Control` ajută la citirea octeților superiori pentru LBA48.

## Protocol minim pentru o comandă ATA
1. Aștepți ca `BSY = 0`.
2. Verifici că unitatea e pregătită (`DRDY = 1`, după caz).
3. Selectezi unitatea în `Device`.
4. Încarci parametrii: `Features`, `Sector Count`, `LBA`.
5. Scrii codul în `Command`.
6. Aștepți `DRQ = 1` pentru comenzi cu date sau finalizarea pentru comenzi fără date.
7. Citești/scrii prin `Data` dacă este transfer PIO.
8. Verifici `ERR` și `Error` la final.

## Comenzi ATA esențiale
### Execute Device Diagnostic
- Rulează testele interne de diagnostic.
- Poate testa ambele unități de pe canal.
- După execuție, registrul `Error` conține codul de diagnostic.
- Semnături importante:
  - **ATA**: `Sector Count=0x01`, `LBA Low=0x01`, `LBA Mid=0x00`, `LBA High=0x00`
  - **ATAPI**: semnătură diferită, utilă la identificare

### Identify Device
- Returnează **256 cuvinte** cu informații despre unitate.
- Important pentru:
  - model
  - serie
  - firmware
  - capabilități
  - număr total de sectoare
- Cuvinte utile:
  - **10–19**: serial
  - **23–26**: firmware
  - **27–46**: model
  - **60–61**: total sectoare LBA28
  - **100–103**: total sectoare LBA48

### Read Native Max Address Ext
- Folosită la unități cu **LBA48**.
- Returnează adresa LBA maximă nativă.
- Se citește din `LBA Low/Mid/High`, inclusiv partea superioară prin **HOB**.

### SMART Return Status
- Verifică starea de sănătate **S.M.A.R.T.**.
- Necesită valori specifice în registre înainte de comandă.
- Rezultatul se vede în `LBA Mid` și `LBA High`:
  - **0x4F / 0xC2** → stare bună
  - **0xF4 / 0x2C** → prag depășit / risc

## Ce merită reținut pentru examen
- Diferența **CHS vs LBA**.
- Diferența **PIO vs DMA vs UDMA**.
- Registrele-cheie: **Status, Device, Sector Count, LBA Low/Mid/High, Data, Error**.
- Biții-cheie din `Status`: **BSY, DRDY, DRQ, ERR**.
- Comenzile importante: **Execute Device Diagnostic, Identify Device, Read Native Max Address Ext, SMART Return Status**.
- SATA păstrează modelul logic ATA, dar schimbă interfața fizică în una serială.

