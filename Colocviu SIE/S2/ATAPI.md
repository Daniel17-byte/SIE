# Lab 8 — Discuri compact. Interfața ATAPI

## Scop
- Înțelegerea pe scurt a structurii discului compact și a interfeței **ATAPI**.
- Folosirea pachetelor de comandă pentru unități CD/DVD.

## Esențial despre CD
- Discul compact stochează date pe o **spirală**.
- Informația este reprezentată prin:
  - **pits** (cavități)
  - **lands** (suprafețe plane)
- Citirea se face optic, prin reflexia diferită a razei laser.

## Codificarea datelor pe CD
- Se folosește **NRZI**:
  - tranziție = bit 1
  - fără tranziție = bit 0
- Pentru înregistrare se folosește **EFM (Eight-to-Fourteen Modulation)**:
  - 8 biți de date → 14 biți codificați
  - se mai adaugă **3 biți de legătură**
- Scopul EFM:
  - densitate bună
  - suficiente tranziții pentru sincronizare
  - evitarea secvențelor prea scurte sau prea lungi
- Codul respectă ideea **RLL (2,10)**.

## Organizarea datelor pe CD
- Datele sunt grupate în **cadre**, apoi în **sectoare**.
- Există nivele de **corecție a erorilor** pentru fiabilitate.
- Pentru sistemul de fișiere al CD-urilor de date contează standardul **ISO 9660**.

## De ce ATAPI
- Interfața ATA clasică nu este suficient de flexibilă pentru unități optice.
- **ATAPI** păstrează interfața fizică ATA, dar schimbă nivelul logic.
- Comenzile nu se mai transmit doar prin registre simple, ci prin **pachete de comandă**.

## Ideea de bază
- Se folosește comanda ATA **PACKET**.
- După aceasta, comanda reală se trimite ca **pachet** prin registrul `Data`.
- Pachetul de comandă ATAPI are uzual **12 octeți**.
- Multe comenzi sunt derivate din lumea **SCSI**.

## Diferențe față de SCSI
- Dispozitivul ATAPI lucrează ca **slave**.
- Nu există faze complexe și mesaje ca în SCSI clasic.
- Nu există deconectare/reconectare.
- Se folosesc pachete mai simple, compatibile cu mediul ATA.

## Registre ATAPI importante
- Sunt aceleași poziții ca la ATA:
  - **Data**
  - **Error / Features**
  - **Interrupt Reason**
  - **LBA Low**
  - **Byte Count Low / High**
  - **Device**
  - **Status / Command**
  - **Alternate Status / Device Control**

## Ce este diferit față de ATA
- În loc de `Sector Count`, la citire apare **Interrupt Reason**.
- În locul unor semnificații ATA, registrele `Byte Count Low/High` spun câți octeți trebuie transferați în etapa curentă.
- Pentru identificare corectă se folosește **IDENTIFY PACKET DEVICE**, nu `IDENTIFY DEVICE`.

## Execuția unei comenzi ATAPI
1. Aștepți `BSY = 0` și `DRQ = 0`.
2. Selectezi unitatea prin `Device`.
3. Încarci `Byte Count Low/High` cu lungimea maximă de transfer dorită.
4. Scrii comanda **PACKET** în `Command`.
5. Când `DRQ = 1`, trimiți pachetul de 12 octeți prin `Data`.
6. Pentru transferuri PIO, citești/scrii exact numărul de octeți cerut de `Byte Count`.
7. La final verifici `Status` și eventual `CHK` / `Error`.

## Protocoale importante
### Comenzi fără transfer de date
- Exemple: **START/STOP UNIT**, **PLAY AUDIO**, **SEEK**.
- Se trimite `PACKET`, apoi pachetul de comandă; nu urmează schimb de date.

### Comenzi cu transfer PIO
- Dispozitivul cere dimensiunea blocului prin **Byte Count Low/High**.
- Gazda trebuie să respecte exact numărul de octeți cerut la fiecare fază DRQ.

## Identificarea unui periferic ATAPI
- Un dispozitiv ATAPI poate fi detectat și după semnătura specifică returnată după diagnostic/reset.
- Comanda corectă de identificare este **IDENTIFY PACKET DEVICE**.
- `IDENTIFY DEVICE` pentru ATAPI duce de regulă la **ABRT**.

## Comenzi ATAPI importante pentru CD/DVD
- **IDENTIFY PACKET DEVICE** — identifică unitatea.
- **TEST UNIT READY** — verifică dacă unitatea/discul este gata.
- **REQUEST SENSE** — detalii despre eroare/stare.
- **READ (12)** — citire de date.
- **READ CD RECORDED CAPACITY** — capacitatea efectivă a discului.
- **READ TOC/PMA/ATIP** — tabela de conținut / informații despre disc.
- **PLAY AUDIO MSF** — redare audio după Minute-Second-Frame.
- **START/STOP UNIT** — pornește/oprește unitatea, poate controla tava.
- **STOP PLAY/SCAN** — oprește redarea/scandarea.

## Comenzi pe care merită să le știi mai bine
### PLAY AUDIO MSF
- Folosește adresare de tip **Minute-Second-Frame**.
- Este specifică redării audio de pe CD.

### READ (12)
- Comandă generală de citire date.
- Se transmite într-un pachet ATAPI de 12 octeți.

### READ CD RECORDED CAPACITY
- Returnează informații despre capacitatea înregistrată a discului.
- Utilă pentru a afla limita reală a suportului.

### READ TOC/PMA/ATIP
- Citește tabela de conținut și alte informații descriptive ale discului.
- Esențială pentru listarea pistelor/sesiunilor.

### START/STOP UNIT
- Controlează pornirea/opririrea mecanismului și, la unele unități, eject/load.

## Ce merită reținut pentru examen
- CD-ul folosește **pits/lands**, citire optică și codificare **EFM**.
- **ATAPI = ATA fizic + comenzi în pachete**.
- Comanda-cheie este **PACKET**.
- Registre importante: **Data, Byte Count Low/High, Status, Command, Device**.
- Identificarea corectă a unității: **IDENTIFY PACKET DEVICE**.
- Comenzi de bază: **READ (12), READ TOC/PMA/ATIP, READ CD RECORDED CAPACITY, START/STOP UNIT, PLAY AUDIO MSF**.

