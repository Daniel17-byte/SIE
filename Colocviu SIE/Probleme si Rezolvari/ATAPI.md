# ATAPI — cerințe și rezolvări explicate

## 1. Cerințe teoretice și răspunsuri

### 1. Care sunt etapele necesare pentru înregistrarea datelor pe discurile compact?
**Răspuns:**
1. Datele binare sunt codificate.
2. Se aplică **EFM** pentru transformarea octeților în secvențe potrivite optic.
3. Se introduc biți de legătură și informații de sincronizare.
4. Se aplică nivelurile de corecție a erorilor.
5. Se formează cadrele și sectoarele.
6. Laserul inscripționează informația sub formă de **pits** și **lands**.

### 2. Cum se realizează corecția erorilor în interiorul cadrelor?
**Răspuns:**
- Prin coduri de corecție și detectare a erorilor, bazate pe intercalare și coduri Reed–Solomon/CIRC.
- Ideea este că erorile locale de pe disc pot fi distribuite și corectate la citire.

### 3. Cum este posibilă citirea simultană a datelor și a informațiilor audio/video pe CD-I și CD-ROM/XA?
**Răspuns:**
- Prin organizarea sectoarelor și sub-antetelor astfel încât fluxuri diferite de date să poată fi separate și interpretate corect.
- Practic, formatul discului permite coexistenta mai multor tipuri de informație pe același suport.

### 4. Ce reprezintă sub-canalele discului compact și la ce se utilizează?
**Răspuns:**
- Sunt canale auxiliare (`P` până la `W`) asociate datelor principale.
- Se folosesc pentru control, temporizare, poziție, TOC, informații despre piste și alte metadate.

---

## 2. Aplicații practice — cerințe și rezolvare

### 8.8.2 — IDENTIFY PACKET DEVICE
**Cerință:**
Scrie o funcție care transmite `IDENTIFY PACKET DEVICE` și afișează model, serie, firmware și lungimea pachetului de comandă ATAPI.

**Rezolvare:**
- Pornești din proiectul de la laboratorul ATA.
- Selectezi unitatea ATAPI.
- Trimiți comanda `IDENTIFY PACKET DEVICE`.
- Urmezi același protocol ca la `IDENTIFY DEVICE` ATA (transfer PIO de 256 cuvinte).
- Citești blocul și extragi:
  - model;
  - număr de serie;
  - firmware;
  - lungimea pachetului ATAPI din câmpurile de identificare.

```c
#define ATAPI_CMD_IDENTIFY_PACKET 0xA1

void IdentifyPacketDevice(WORD cmdBase, BYTE devNo, WORD* idBuf)
{
    // Selectam unitatea tinta (master/slave) in registrul Device.
    _outp(cmdBase + ATA_REG_DEVICE, ATA_DH_LBA | (devNo ? 0x10 : 0x00));
    // Trimitem comanda ATAPI de identificare (A1h).
    _outp(cmdBase + ATA_REG_CMD, ATAPI_CMD_IDENTIFY_PACKET);

    // Asteptam terminarea fazei interne de pregatire (BSY trebuie sa devina 0).
    while (_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_BSY)
    {
        ;
    }

    // Asteptam DRQ=1: dispozitivul anunta ca are date de livrat.
    while ((_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_DRQ) == 0)
    {
        ;
    }

    // Citim exact 256 de cuvinte (512 bytes) din registrul Data.
    for (int i = 0; i < 256; i++)
        idBuf[i] = (WORD)_inpw(cmdBase + ATA_REG_DATA);
}
```

**Explicație:**
- Aceasta este comanda corectă de identificare pentru ATAPI; `IDENTIFY DEVICE` nu este cea potrivită pentru o unitate optică ATAPI.

### 8.8.3 — START/STOP UNIT pentru deschiderea tăvii
**Cerință:**
Scrie o funcție care transmite comanda `START/STOP UNIT` pentru a deschide ușa unității.

**Rezolvare:**
1. Definiști un pachet de 12 octeți și îl inițializezi cu `0`.
2. În octetul `0` pui codul comenzii `START/STOP UNIT`.
3. În octetul `4` setezi bitul `LOEJ = 1`.
4. Implementezi protocolul ATAPI **fără transfer de date**.
5. Apelezi funcția pentru unitatea 1 de pe canalul primar și/sau secundar.

```c
#define ATA_CMD_PACKET 0xA0
#define SCSI_START_STOP_UNIT 0x1B

void AtapiStartStopUnit(WORD cmdBase, BYTE devNo)
{
    // Pachetul ATAPI standard are 12 octeti; initializam totul cu 0.
    BYTE pkt[12] = {0};
    // Octetul 0 = codul comenzii SCSI encapsulate in PACKET.
    pkt[0] = SCSI_START_STOP_UNIT;
    // Octetul 4: setam LOEJ=1 pentru load/eject (control tava).
    pkt[4] = 0x02; // LOEJ = 1

    // Selectam unitatea ATAPI tinta.
    _outp(cmdBase + ATA_REG_DEVICE, ATA_DH_LBA | (devNo ? 0x10 : 0x00));
    // Pornim secventa ATA PACKET.
    _outp(cmdBase + ATA_REG_CMD, ATA_CMD_PACKET);

    // Asteptam DRQ=1: dispozitivul cere pachetul de comanda.
    while ((_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_DRQ) == 0)
    {
        ;
    }

    // Trimitem cei 12 octeti ca 6 cuvinte de 16 biti prin Data.
    for (int i = 0; i < 6; i++)
        _outpw(cmdBase + ATA_REG_DATA, ((WORD*)pkt)[i]);
}
```

**Explicație:**
- `LOEJ` înseamnă load/eject, deci exact bitul care controlează mecanismul tăvii.

### 8.8.4 — READ CD RECORDED CAPACITY
**Cerință:**
Citește capacitatea înregistrată a unui CD/DVD și afișează ultimul bloc logic, lungimea blocului și capacitatea în MB.

**Rezolvare:**
1. Creezi pachetul de 12 octeți, inițializat cu `0`.
2. În octetul `0` pui codul `READ CD RECORDED CAPACITY`.
3. Aloci un buffer de `8` octeți pentru datele întoarse.
4. Implementezi protocolul ATAPI **PIO input**.
5. La succes:
   - extragi adresa ultimului bloc logic;
   - extragi lungimea blocului;
   - incrementezi adresa ultimului bloc pentru a obține numărul total de blocuri;
   - calculezi capacitatea în MB.

```c
#define SCSI_READ_CD_CAPACITY 0x25

void AtapiReadRecordedCapacity(WORD cmdBase, BYTE devNo)
{
    // Pachetul de comanda (12B) trimis spre unitate.
    BYTE pkt[12] = {0};
    // Bufferul raspunsului: comanda intoarce 8 octeti.
    BYTE data[8] = {0};

    // Octetul 0 = codul SCSI pentru READ CAPACITY.
    pkt[0] = SCSI_READ_CD_CAPACITY;

    // Selectam unitatea ATAPI.
    _outp(cmdBase + ATA_REG_DEVICE, ATA_DH_LBA | (devNo ? 0x10 : 0x00));
    // Lansam comanda ATA PACKET.
    _outp(cmdBase + ATA_REG_CMD, ATA_CMD_PACKET);

    // Prima faza DRQ: dispozitivul asteapta pachetul de 12 octeti.
    while ((_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_DRQ) == 0)
    {
        ;
    }

    // Scriem pachetul (12B = 6 words) in registrul Data.
    for (int i = 0; i < 6; i++)
        _outpw(cmdBase + ATA_REG_DATA, ((WORD*)pkt)[i]);

    // A doua faza DRQ: dispozitivul are acum date de returnat.
    while ((_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_DRQ) == 0)
    {
        ;
    }

    // Citim 8 octeti = 4 words din registrul Data.
    for (int i = 0; i < 4; i++)
        ((WORD*)data)[i] = (WORD)_inpw(cmdBase + ATA_REG_DATA);

    // Octetii 0..3 (big-endian) reprezinta ultimul LBA inregistrat.
    DWORD lastLba = ((DWORD)data[0] << 24) | ((DWORD)data[1] << 16) |
                    ((DWORD)data[2] << 8)  | (DWORD)data[3];
    // Octetii 4..7 (big-endian) reprezinta dimensiunea unui bloc logic.
    DWORD blkLen  = ((DWORD)data[4] << 24) | ((DWORD)data[5] << 16) |
                    ((DWORD)data[6] << 8)  | (DWORD)data[7];

    // afiseaza capacitatea
}
```

**Explicație:**
- Răspunsul întors de unitate este big-endian pe octeți, deci trebuie reconstruit cu grijă.

### 8.8.5 — READ TOC/PMA/ATIP
**Cerință:**
Citește TOC-ul unui CD audio și afișează pistele și momentele de început.

**Rezolvare:**
1. Creezi pachetul de 12 octeți și bufferul de 256 octeți.
2. În octetul `0` pui comanda `READ TOC/PMA/ATIP`.
3. În octetul `1` setezi bitul `MSF = 1`.
4. Lași formatul `0000b` în octetul `2`.
5. În octeții `7` și `8` pui dimensiunea bufferului alocat.
6. Rulezi protocolul ATAPI **PIO input**.
7. La succes afișezi:
   - prima pistă;
   - ultima pistă;
   - pentru fiecare pistă: minut, secundă, frame.

```c
#define SCSI_READ_TOC 0x43

void AtapiReadToc(WORD cmdBase, BYTE devNo)
{
    // Pachetul ATAPI de comanda (12 octeti).
    BYTE pkt[12] = {0};
    // Buffer pentru raspuns TOC (aici 256 octeti).
    BYTE data[256] = {0};

    // Octetul 0 = comanda SCSI READ TOC/PMA/ATIP.
    pkt[0] = SCSI_READ_TOC;
    // Octetul 1, bit 1 (MSF) = 1 => adresele vor fi in format Minute/Second/Frame.
    pkt[1] = 0x02; // MSF = 1
    // Allocation length (big-endian): cerem 0x0100 = 256 octeti.
    pkt[7] = 0x01;
    pkt[8] = 0x00; // 256 bytes

    // Selectam unitatea tinta.
    _outp(cmdBase + ATA_REG_DEVICE, ATA_DH_LBA | (devNo ? 0x10 : 0x00));
    // Incepem secventa ATA PACKET.
    _outp(cmdBase + ATA_REG_CMD, ATA_CMD_PACKET);

    // DRQ faza 1: unitatea asteapta pachetul de comanda.
    while ((_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_DRQ) == 0)
    {
        ;
    }

    // Trimitem pachetul de 12 octeti ca 6 words.
    for (int i = 0; i < 6; i++)
        _outpw(cmdBase + ATA_REG_DATA, ((WORD*)pkt)[i]);

    // DRQ faza 2: unitatea anunta disponibilitatea datelor TOC.
    while ((_inp(cmdBase + ATA_REG_STATUS) & ATA_SR_DRQ) == 0)
    {
        ;
    }

    // Citim 256 octeti = 128 words in bufferul local.
    for (int i = 0; i < 128; i++)
        ((WORD*)data)[i] = (WORD)_inpw(cmdBase + ATA_REG_DATA);

    // In header-ul TOC, byte 2/3 contin prima si ultima pista.
    BYTE firstTrack = data[2];
    BYTE lastTrack  = data[3];
    // afiseaza M/S/F pentru fiecare descriptor de pista
}
```

**Explicație:**
- `MSF` face ca adresele să fie interpretate ca **Minute / Second / Frame**, format natural pentru audio CD.

---

## 3. Șablon logic pentru o comandă ATAPI
```text
asteapta BSY=0 si DRQ=0
selecteaza unitatea
pregateste Byte Count daca e cazul
scrie comanda PACKET in Command
asteapta DRQ=1
trimite pachetul de 12 octeti prin Data
executa faza de transfer PIO sau asteapta finalizarea
interpreteaza bufferul returnat
```

---

## 4. Ce trebuie reținut rapid
- **ATAPI = ATA fizic + comenzi în pachete**.
- Comanda-cheie este **PACKET**.
- Pentru identificare se folosește **IDENTIFY PACKET DEVICE**.
- Pentru control media/unitate contează:
  - `START/STOP UNIT`
  - `READ CD RECORDED CAPACITY`
  - `READ TOC/PMA/ATIP`
- Pentru audio CD, formatul **MSF** este foarte important.

