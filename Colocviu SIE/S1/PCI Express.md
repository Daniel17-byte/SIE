# Lab 2 — Magistrala PCI Express

## Scop
- Înțelegerea arhitecturii PCI Express și a modului de acces la spațiul de configurație.
- Identificarea dispozitivelor PCI/PCIe și decodificarea registrelor de configurație.

## Esențial
- **PCIe** este varianta serială, punct-la-punct, a familiei PCI.
- Păstrează modelul software PCI clasic: spații de **memorie**, **I/E** și **configurație**.
- Folosește **pachete**, nu magistrală paralelă partajată.
- Avantaje: mai puțini pini, frecvențe mai mari, scalabilitate, fiabilitate mai bună.

## Link-ul PCIe
- O legătură minimă are:
  - un canal pentru transmisie
  - un canal pentru recepție
- Fiecare canal folosește semnale diferențiale.
- Un astfel de cuplu formează o **bandă (lane)**.
- Lățimi uzuale: **x1, x2, x4, x8, x16, x32**.
- Lățimea și viteza se negociază la inițializare.

## Topologie
- Componente importante:
  - **Root Complex** — leagă CPU/memoria de I/O
  - **Endpoint** — periferic PCIe
  - **Switch** — comută/rutează pachete între porturi
  - **Bridge PCIe-PCI** — compatibilitate cu PCI clasic
- Sistemul este organizat ierarhic pe magistrale, dispozitive și funcții.

## Nivele logice importante
- **Nivel software / configurare**: enumerare și configurare de către OS.
- **Nivel tranzacții**: formează pachetele PCIe.
- **Nivel legătură de date**: verifică integritatea și secvențierea.
- **Nivel fizic**: transmite serial pe lane-uri.

## Tipuri de tranzacții
- **Memorie**
- **I/O**
- **Configurație**
- **Mesaje**

## Idei-cheie despre pachete
- Nivelul tranzacțiilor construiește antetul și datele.
- Opțional apare **ECRC** pentru verificare end-to-end.
- Nivelul legăturii adaugă număr de secvență și **LCRC**.
- Nivelul fizic adaugă delimitatori de început/sfârșit și codifică fluxul.

## Întreruperi PCIe
- Mecanismul nativ este **MSI (Message Signaled Interrupts)**.
- MSI nu înseamnă „linie de întrerupere”, ci o **scriere în memorie** la o adresă rezervată.
- Dispozitivele vechi compatibile PCI pot folosi modelul **INTx** prin mesaje speciale/compatibilitate.

## Nivelul fizic
- Transmisia este serială, diferențială.
- Pentru link-uri late, octeții se distribuie pe mai multe lane-uri.
- Se folosește codificare pentru a asigura suficiente tranziții de sincronizare:
  - versiuni vechi: **8b/10b**
  - de la PCIe 3.0: **128b/130b**
- Nivelul fizic face și inițializarea/antrenarea legăturii.

## Spațiul de configurație
- O funcție PCI clasică: **256 B**.
- O funcție PCIe: **4 KB**.
- Primii **256 B** = spațiu compatibil PCI.
- Restul = spațiu extins PCIe.

## Acces la configurație
### 1. Mecanism compatibil PCI
- Se folosesc porturile:
  - **0xCF8** — adresa de configurație
  - **0xCFC** — datele de configurație
- În `0xCF8` se pun:
  - număr magistrală
  - număr dispozitiv
  - număr funcție
  - offset registru
  - bitul **Enable**

### 2. Mecanism îmbunătățit PCIe
- Spațiul de configurație este mapat în memorie.
- Adresa selectează: **bus / device / function / dword / byte offset**.
- Este necesar pentru acces la spațiul extins PCIe.

## Registre de configurație obligatorii
- **Vendor ID** — producătorul dispozitivului.
- **Device ID** — tipul dispozitivului.
- **Revision ID** — revizia.
- **Class Code / Subclass / Programming Interface** — ce face dispozitivul.
- **Command** — activează acces I/O, memorie, bus mastering etc.
- **Status** — stare și erori.

## Ce merită reținut pentru examen
- PCIe = **serial, punct-la-punct, bazat pe pachete**.
- Diferența dintre **lane**, **link**, **switch**, **root complex**, **endpoint**.
- Cele 3 niveluri reale ale dispozitivului: **transaction / data link / physical**.
- **MSI** este mecanismul modern de întreruperi.
- Accesul la configurație se face fie prin **0xCF8/0xCFC**, fie prin spațiu mapat în memorie.
- Cele mai importante registre: **Vendor ID, Device ID, Class Code, Command, Status**.

