# Rezumat — Metode IE

## Temele capitolului
- I/E programate
- I/E prin întreruperi
- DMA (acces direct la memorie)
- procesoare de I/E

## 1. I/E programate
### Principiu
- transferul este controlat direct de **UCP**;
- datele se mută între registrele UCP și registrele modulului de I/E;
- dispozitivul de I/E **nu are acces direct** la memoria principală.

### Cum are loc o operație
1. UCP trimite comandă modulului de I/E;
2. modulul execută operația;
3. actualizează registrul de stare;
4. UCP verifică periodic starea modulului.

### Avantaje
- implementare simplă;
- control direct.

### Dezavantaje
- UCP este ocupată cu testarea stării;
- eficiență redusă pentru periferice lente.

## 2. Adresarea dispozitivelor de I/E
### A. Mapare în memorie
- un singur spațiu de adrese pentru memorie și I/E;
- se folosesc aceleași instrucțiuni ca pentru memorie;
- nu sunt necesare instrucțiuni speciale de I/E.

### B. Adresare izolată
- spațiu separat pentru I/E;
- sunt necesare linii de comandă specifice (`IORD`, `IOWR`) și instrucțiuni separate de I/E.

### Comparație scurtă
- **mapare în memorie** → mai simplă din punct de vedere software;
- **adresare izolată** → spațiu separat, dar necesită suport hardware și instrucțiuni speciale.

## 3. I/E prin întreruperi
### Principiu
- UCP nu mai verifică permanent perifericul;
- perifericul cere atenție printr-o **întrerupere**;
- UCP suspendă programul curent și intră în rutina de tratare.

### Sisteme de întreruperi cu priorități
- dacă apar cereri simultane, este necesar un sistem de priorități;
- prioritizarea poate fi:
  - prin software (interogare / polling);
  - prin hardware (controler de întreruperi).

### Conectarea în paralel a liniilor de întrerupere
- se folosește registrul cererilor de întrerupere `RINT`;
- fiecare dispozitiv setează separat biții;
- prioritatea depinde de poziția biților;
- registrul măștilor `RM` permite mascarea individuală a cererilor.

### Conectarea în serie (daisy chain)
- dispozitivele sunt legate în lanț;
- fiecare are intrare `PI` și ieșire `PO`;
- prioritatea este dată de poziția în lanț;
- dispozitivul cu prioritate mare poate bloca propagarea semnalului.

## 4. DMA — acces direct la memorie
### Principiu
- datele sunt transferate între periferic și memorie fără implicarea UCP la fiecare cuvânt;
- UCP doar inițializează transferul.

### De ce e util
- elimină încărcarea mare a UCP din I/E programate și întreruperi;
- este potrivit pentru volume mari de date.

### Moduri importante
#### Furt de ciclu (cycle stealing)
- DMA „fură” temporar magistrala;
- UCP este suspendată doar pe perioade scurte;
- rată mai mică decât transferul pe blocuri.

#### Transfer în rafală / pe blocuri
- DMA primește magistrala pe durata unui bloc;
- UCP este suspendată complet pe durata transferului;
- rată de transfer mai mare.

### Controlerul DMA
- memorează adresa de memorie;
- memorează adresa perifericului;
- știe numărul de date rămase;
- controlează direcția și finalizarea transferului.

## 5. Procesoare de I/E
- execută programe dedicate pentru operații de I/E;
- permit reducerea încărcării UCP;
- pot coordona secvențe complexe și transferuri DMA.

## Ce să reții pentru examen
- diferența dintre **I/E programate**, **întreruperi**, **DMA**;
- mapare în memorie vs adresare izolată;
- paralel vs serie la liniile de întrerupere;
- furt de ciclu vs transfer pe blocuri;
- rolul controlerului DMA și al procesoarelor de I/E.

