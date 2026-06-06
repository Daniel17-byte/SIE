# PCI Express — cerințe și rezolvări explicate

## 1. Cerințe teoretice și răspunsuri

### 1. Ce îmbunătățiri aduce PCIe față de PCI / PCI-X?
**Răspuns:**
- comunicație **serială** în loc de paralelă;
- legături **punct-la-punct**, nu magistrală partajată;
- rate de transfer mai mari și scalabile pe `x1, x4, x8, x16` etc.;
- fiabilitate mai bună și verificare a erorilor;
- compatibilitate software cu modelul PCI clasic.

### 2. Care sunt componentele principale ale topologiei PCIe?
**Răspuns:**
- **Root Complex**;
- **Endpoint-uri**;
- **Switch-uri**;
- **Bridge-uri PCIe-PCI**.

### 3. Cum semnalează dispozitivele PCIe întreruperile?
**Răspuns:**
- metoda nativă: **MSI / MSI-X** (scriere în memorie);
- compatibilitate veche: **INTx** prin mecanism compatibil PCI.

### 4. Ce parametri se negociază la inițializarea și antrenarea legăturii?
**Răspuns:**
- **lățimea link-ului** (numărul de lane-uri);
- **viteza/frecvența de funcționare** a link-ului.

### 5. Ce registre folosim pentru identificarea unei funcții PCIe?
**Răspuns:**
- **Vendor ID**;
- **Device ID**;
- **Revision ID**;
- **Class / Subclass / Programming Interface**.
- În sistem, funcția este localizată prin **Bus / Device / Function**.

---

## 2. Aplicații practice — cerințe și rezolvare

### 2.7.2 — identificarea dispozitivelor PCIe prin mecanismul îmbunătățit
**Cerință:**
Creează o aplicație care identifică toate dispozitivele PCIe și afișează pentru fiecare:
- bus / device / function;
- class / subclass / progIF;
- subsystem vendor ID și subsystem ID;
- descriptorii clasei și interfeței.

**Rezolvare:**
1. Creezi proiect Windows Desktop gol.
2. Adaugi `AppScroll`, `Hw.h`, `Hw64.lib`, `PCI.h`, `Pci-vendor-dev.h`, `PciBaseAddressUEFI.cpp`.
3. Apelezi `PciBaseAddressUEFI()` și salvezi baza spațiului de configurație extins.
4. Scrii o funcție care, pentru `(bus, device, function)`, calculează adresa antetului de configurație de tip `PCI_CONFIG0`.
5. Iterezi:
   - bus: `0..63`
   - device: `0..31`
   - function: `0..7`
6. Dacă `VendorID == 0xFFFF`, funcția nu există.
7. Pentru cele existente, citești și afișezi câmpurile cerute.

```c
DWORD64 gPciBase = 0;                         // variabilă globală: baza spațiului PCIe mapat în memorie

PCI_CONFIG0* GetPciHeader(BYTE bus, BYTE dev, BYTE fun)   // funcție care calculează adresa antetului pentru un triplet Bus/Device/Function
{                                                         // începutul funcției
    DWORD64 addr = gPciBase                               // pornești de la baza întregului spațiu de configurație PCIe
        + ((DWORD64)bus << 20)                            // adaugi deplasamentul pentru magistrala (bus); fiecare bus ocupă 1 MB
        + ((DWORD64)dev << 15)                            // adaugi deplasamentul pentru device; fiecare device ocupă 32 KB în cadrul bus-ului
        + ((DWORD64)fun << 12);                           // adaugi deplasamentul pentru function; fiecare funcție ocupă 4 KB

    return (PCI_CONFIG0*)addr;                            // întorci adresa calculată, convertită la pointer spre antet PCI de tip 0
}                                                         // sfârșitul funcției GetPciHeader

void EnumPcieDevices(void)                                // funcție care enumeră toate funcțiile PCIe din intervalul ales
{                                                         // începutul funcției de enumerare
    for (BYTE bus = 0; bus < 64; bus++)                   // parcurgi toate magistralele de la 0 la 63
    {                                                     // începutul buclei pentru bus
        for (BYTE dev = 0; dev < 32; dev++)              // parcurgi toate device-urile posibile de pe magistrala curentă
        {                                                 // începutul buclei pentru dev
            for (BYTE fun = 0; fun < 8; fun++)           // parcurgi toate funcțiile posibile ale device-ului curent
            {                                             // începutul buclei pentru fun
                PCI_CONFIG0* pCfg = GetPciHeader(bus, dev, fun);        // obții pointer la antetul de configurație al funcției curente
                WORD vendor = _inmw((DWORD_PTR)&pCfg->VendorID);        // citești Vendor ID pentru a verifica dacă funcția există

                if (vendor == 0xFFFF)                     // 0xFFFF înseamnă că nu există dispozitiv/funție la această adresă
                    continue;                             // sari direct la următoarea funcție, fără alte prelucrări

                BYTE baseClass = _inp((DWORD_PTR)&pCfg->BaseClassCode); // citești codul clasei de bază a dispozitivului
                BYTE subClass  = _inp((DWORD_PTR)&pCfg->SubClassCode);  // citești subclasa dispozitivului
                BYTE progIf    = _inp((DWORD_PTR)&pCfg->ProgIf);        // citești interfața de programare (Programming Interface)

                // aici afișezi bus / device / function și descriptorii aferenți clasei, subclasei și interfeței
            }                                             // sfârșitul buclei pentru fun
        }                                                 // sfârșitul buclei pentru dev
    }                                                     // sfârșitul buclei pentru bus
}                                                         // sfârșitul funcției EnumPcieDevices
```

**Explicație:**
- Mecanismul îmbunătățit mapează spațiul PCIe în memorie, deci accesul este direct la adrese calculate din B/D/F.
- `VendorID = 0xFFFF` este testul standard pentru „funcție inexistentă”.

### 2.7.3 — afișarea descriptorilor vendor/device
**Cerință:**
Extinde aplicația precedentă și afișează și:
- Vendor ID + numele producătorului;
- Device ID + descrierea circuitului.

**Rezolvare:**
- Cauți `VendorID` în `PciVenTable`.
- Cauți perechea `(VendorID, DeviceID)` în `PciDevTable`.
- Afișezi `VenFull`, `Chip`, `ChipDesc`.

```c
void PrintVendorDeviceInfo(WORD vendorId, WORD deviceId)
{
    for (int i = 0; i < PCI_VENTABLE_LEN; i++)
    {
        if (PciVenTable[i].VenId == vendorId)
        {
            // afiseaza PciVenTable[i].VenFull
            break;
        }
    }

    for (int i = 0; i < PCI_DEVTABLE_LEN; i++)
    {
        if (PciDevTable[i].VenId == vendorId &&
            PciDevTable[i].DevId == deviceId)
        {
            // afiseaza PciDevTable[i].Chip si ChipDesc
            break;
        }
    }
}
```

**Explicație:**
- Valorile numerice devin utile abia după maparea la un text descriptiv.

### 2.7.4 — aceeași enumerare, dar prin mecanism compatibil PCI
**Cerință:**
Accesează spațiul de configurație folosind metoda clasică PCI (`0xCF8/0xCFC`).

**Rezolvare:**
- Scrii o funcție care formează cuvântul de adresă pentru portul `0xCF8`.
- Setezi bitul `Enable`.
- Scrii adresa în `0xCF8` și citești cuvântul dublu din `0xCFC`.
- Repeți pentru dword-urile relevante din antet.

```c
#define PCI_CFG_ADDR 0x0CF8
#define PCI_CFG_DATA 0x0CFC

DWORD ReadPciDwordLegacy(BYTE bus, BYTE dev, BYTE fun, BYTE dwordIndex)
{
    DWORD address = 0x80000000
        | ((DWORD)bus << 16)
        | ((DWORD)dev << 11)
        | ((DWORD)fun << 8)
        | ((DWORD)dwordIndex << 2);

    _outpd(PCI_CFG_ADDR, address);
    return _inpd(PCI_CFG_DATA);
}
```

**Explicație:**
- Aceasta este metoda veche, limitată la spațiul compatibil PCI de 256 B, dar suficientă pentru câmpurile esențiale.

### 2.7.5 — identificarea controlerului SMBus din PCIe
**Cerință:**
Identifică controlerul SMBus și afișează conținutul registrelor BAR.

**Rezolvare:**
1. Scrii o funcție care caută un dispozitiv PCIe după **class code** și **subclass code**.
2. Cauți codurile:
   - class = `0x0C`
   - subclass = `0x05`
3. După găsire, afișezi B/D/F.
4. Parcurgi cele 6 BAR-uri.
5. Pentru fiecare BAR:
   - verifici dacă este **memory BAR** sau **I/O BAR**;
   - dacă e de memorie, verifici dacă e 32/64 biți și extragi baza;
   - dacă e de I/O, extragi adresa de bază de I/O.

```c
DWORD FindDeviceByClass(BYTE wantedBaseClass, BYTE wantedSubClass)
{
    for (BYTE bus = 0; bus < 64; bus++)
    {
        for (BYTE dev = 0; dev < 32; dev++)
        {
            for (BYTE fun = 0; fun < 8; fun++)
            {
                PCI_CONFIG0* pCfg = GetPciHeader(bus, dev, fun);
                WORD vendor = _inmw((DWORD_PTR)&pCfg->VendorID);

                if (vendor == 0xFFFF)
                    continue;

                BYTE baseClass = _inp((DWORD_PTR)&pCfg->BaseClassCode);
                BYTE subClass  = _inp((DWORD_PTR)&pCfg->SubClassCode);

                if (baseClass == wantedBaseClass && subClass == wantedSubClass)
                    return ((DWORD)bus << 16) | ((DWORD)dev << 8) | fun;
            }
        }
    }

    return 0;
}

void DumpBars(PCI_CONFIG0* pCfg)
{
    for (int i = 0; i < 6; i++)
    {
        DWORD bar = _inpd((DWORD_PTR)&pCfg->BaseAddresses[i]);

        if (bar & 0x1)
        {
            DWORD ioBase = bar & ~0x3;
            // afiseaza I/O BAR
        }
        else
        {
            DWORD memBase = bar & ~0xF;
            bool is64 = ((bar >> 1) & 0x3) == 0x2;
            // afiseaza Memory BAR 32/64
            if (is64)
                i++;
        }
    }
}
```

**Explicație:**
- BAR-urile spun unde sunt mapate resursele hardware ale dispozitivului.
- Această aplicație este puntea naturală spre laboratorul de SMBus.

---

## 3. Șablon logic de implementare
```text
baza = PciBaseAddressUEFI()
for bus in 0..63:
  for dev in 0..31:
    for fun in 0..7:
      reg = GetPciHeader(bus, dev, fun)
      if VendorID != 0xFFFF:
        afiseaza informatiile
```

---

## 4. Ce trebuie reținut rapid
- PCIe = **serial + punct-la-punct + pachete**.
- Pentru enumerare ai nevoie de **B/D/F** și de citirea antetului de configurație.
- Ai două metode de acces:
  - **Enhanced PCIe configuration**
  - **compatibil PCI: 0xCF8 / 0xCFC**
- Pentru laboratorul următor este esențială identificarea controlerului **SMBus** după codurile de clasă.

