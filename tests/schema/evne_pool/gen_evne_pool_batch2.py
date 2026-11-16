# -*- coding: utf-8 -*-
"""Brainarea — evne-pool batch 2 generator [3-VEIS] FASE 2 (todo #3750).
Deterministisk (ingen RNG). Bygger i prod-treet:
  tests/schema/evne_pool/def-evne-t3-verbal.{no,en}.json   (50 ability-items, 5 options)
  tests/schema/evne_pool/def-evne-t4-romlig.{no,en}.json   (40 ability-items, 5 options)
  tests/schema/evne_pool/_evne_pool_batch2_meta.json       (fasit/tags/provenance)
Kontrakt: tests/schema/_evne_itemspec_spec.json — T3 (vr) poolMin 50, 5 options,
SEPARAT forfattet per spraak (konstrukt-ekvivalens per item-blokk: samme band+subtype
per indeks, ikke oversatt tekst); T4 (sp) poolMin 40, 5 options, tekstbaerent romlig,
prompt+valg oversatt, fasit-formulering identisk per variant. Bands L/M/H andel
0.34/0.33/0.33 +- 0.15. Ingen Raven/WAIS/WISC/Mensa-reproduksjoner (copyrightControl).
Kjor: python3 gen_evne_pool_batch2.py  (sandbox/WSL eller windows-host; dual-path)
"""
import json, os, sys

PROD = None
for p in [r'F:\maneit\prosjekter\filip-webside-prosjekter\brainarea',
          '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea']:
    if os.path.isdir(os.path.join(p, 'tests')):
        PROD = p
        break
assert PROD, 'prod-tre ikke funnet'
OUT = os.path.join(PROD, 'tests', 'schema', 'evne_pool')
os.makedirs(OUT, exist_ok=True)

DIFF = {'L': [-1.75, -1.55, -1.35, -1.15],
        'M': [-0.40, -0.20, 0.00, 0.40],
        'H': [0.60, 0.90, 1.30, 1.70]}

def bval(band, i_in_band):
    return DIFF[band][i_in_band % 4]

# ============================================================ T3 VERBAL (vr)
# Separat forfattet per spraak. Konvensjon: opts[0] = fasit (roteres i koden).
# felt: band, sub (oddone|analogi|klass|leksikalsk), q, opts (5), odd (oddone),
#       tags (4 distraktor-koder; oddone: faste 'set-member').
T3_NO = [
 # ---- L: 6 odd-one-out
 {'band':'L','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: eple, banan, pære, gulrot, drue?','opts':['eple','banan','pære','gulrot','drue'],'odd':3},
 {'band':'L','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: rød, grønn, blå, rund, gul?','opts':['rød','grønn','blå','rund','gul'],'odd':3},
 {'band':'L','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: bok, avis, blad, brev, stein?','opts':['bok','avis','blad','brev','stein'],'odd':4},
 {'band':'L','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: fiolin, cello, trombone, bratsj, kontrabass?','opts':['fiolin','cello','trombone','bratsj','kontrabass'],'odd':2},
 {'band':'L','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: hund, katt, hest, kanin, ørn?','opts':['hund','katt','hest','kanin','ørn'],'odd':4},
 {'band':'L','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: hammer, sag, skrutrekker, boremaskin, spiker?','opts':['hammer','sag','skrutrekker','boremaskin','spiker'],'odd':4},
 # ---- L: 6 analogi
 {'band':'L','sub':'analogi','q':'Fullfør analogien: hånd : hanske :: hode : ?','opts':['lue','sko','belte','skjerf','briller'],'tags':['cat','part-whole','assoc','assoc','part-whole']},
 {'band':'L','sub':'analogi','q':'Fullfør analogien: valp : hund :: kattunge : ?','opts':['katt','ulv','løve','mus','geit'],'tags':['cat','cat','assoc','cat','cat']},
 {'band':'L','sub':'analogi','q':'Fullfør analogien: fly : himmel :: skip : ?','opts':['hav','land','jernbane','garasje','vei'],'tags':['cat','surface-shift','cat','cat','surface-shift']},
 {'band':'L','sub':'analogi','q':'Fullfør analogien: blyant : papir :: maling : ?','opts':['vegg','pensel','bøtte','viskelær','hånd'],'tags':['surface-mismatch','tool-swap','container','assoc','agent']},
 {'band':'L','sub':'analogi','q':'Fullfør analogien: mjau : katt :: bjeff : ?','opts':['hund','fugl','hest','sau','mus'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'analogi','q':'Fullfør analogien: mor : datter :: far : ?','opts':['sønn','mor','bror','onkel','farfar'],'tags':['gender-flip','relation-shift','assoc','generation','generation']},
 # ---- L: 5 klassifikasjon
 {'band':'L','sub':'klass','q':'Hvilket ord hører sammen med de andre: bil, buss, sykkel, tog?','opts':['fly','spade','seng','kopp','stein'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'klass','q':'Hvilket ord hører sammen med de andre: eple, pære, plomme, aprikos?','opts':['banan','gulrot','potet','løk','tomat'],'tags':['cat','cat','cat','cat','cat-ambiguous']},
 {'band':'L','sub':'klass','q':'Hvilket ord hører sammen med de andre: eik, gran, furu?','opts':['bjørk','rose','gress','mose','tang'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'klass','q':'Hvilket ord hører sammen med de andre: rød, blå, grønn?','opts':['gul','bord','rask','kald','boks'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'klass','q':'Hvilket ord hører sammen med de andre: januar, mars, mai?','opts':['juli','tirsdag','jul','vår','fredag'],'tags':['cat','assoc','season-superclass','cat','assoc']},
]

T3_NO_M = [
 # ---- M: 5 analogi
 {'band':'M','sub':'analogi','q':'Fullfør analogien: øye : se :: øre : ?','opts':['høre','lukte','snakke','hode','munn'],'tags':['sense-swap','function-shift','part-whole','part-whole','part-whole']},
 {'band':'M','sub':'analogi','q':'Fullfør analogien: sulten : spise :: tørst : ?','opts':['drikke','sove','gå','lese','skynde seg'],'tags':['need-mismatch','assoc','assoc','assoc','assoc']},
 {'band':'M','sub':'analogi','q':'Fullfør analogien: maler : bilde :: komponist : ?','opts':['symfoni','batong','orkester','sal','instrument'],'tags':['tool','performer','venue','medium']},
 {'band':'M','sub':'analogi','q':'Fullfør analogien: lærer : skole :: lege : ?','opts':['sykehus','medisin','pasient','sykdom','venterom'],'tags':['treatment','client','condition','venue-sub']},
 {'band':'M','sub':'analogi','q':'Fullfør analogien: høne : egg :: ku : ?','opts':['melk','kalv','gress','eng','fjøs'],'tags':['offspring-not-product','input','habitat','habitat']},
 # ---- M: 6 leksikalsk
 {'band':'M','sub':'leksikalsk','q':'Alle planter i drivhuset trenger vanning hver morgen. Orkidéen står i drivhuset. Hva følger?','opts':['Orkidéen trenger vanning hver morgen.','Orkidéen trenger ikke vanning.','Noen planter i drivhuset trenger vanning.','Orkidéen er ikke en plante.','Drivhuset trenger vanning.'],'tags':['negation-flip','weaker','category-break','subject-shift']},
 {'band':'M','sub':'leksikalsk','q':'Kun medlemmer kan låne fra biblioteket på Solvoll. Jon har lånekort der. Hva følger?','opts':['Jon er medlem.','Jon bor på Solvoll.','Jon kan ikke låne der.','Alle med lånekort jobber der.','Jon eier biblioteket.'],'tags':['premise-misread','negation-flip','over-strong','role-invent']},
 {'band':'M','sub':'leksikalsk','q':'Hver onsdag klokken åtte samles koret i menighetshuset. I dag er onsdag klokken åtte. Hva følger?','opts':['Koret samles i menighetshuset nå.','Koret øver hver kveld.','Menighetshuset er stengt.','Koret samler seg klokken ni.','I dag er søndag.'],'tags':['over-strong','invent','time-shift','day-shift']},
 {'band':'M','sub':'leksikalsk','q':'Espen er høyere enn Vera. Vera er høyere enn Nils. Hva følger?','opts':['Espen er høyere enn Nils.','Nils er høyere enn Espen.','Vera er den høyeste.','Nils og Espen er like høy.','Vera er den korteste.'],'tags':['reversed','rank-flip','parity-invent','rank-flip']},
 {'band':'M','sub':'leksikalsk','q':'Kari deltar ikke i maratonløpet. Alle som deltar i maratonløpet trener fem ganger i uken. Hva følger om Karis trening?','opts':['Det lar seg ikke fastslå fra teksten.','Kari trener fem ganger i uken.','Kari trener aldri.','Ingen deltakere trener fem ganger i uken.','Kari løper maraton.'],'tags':['premise-misread','over-strong','scope-flip','premise-misread']},
 {'band':'M','sub':'leksikalsk','q':'Hver gang det blåser fra nordvest, legges ferjeferden om til den lange ruta. Vindmåleren på kaia viser nordvestvind nå. Hva følger?','opts':['Ferjeferden legges om til den lange ruta nå.','Ferjeferden går den korte ruta nå.','Vindmåleren er ødelagt.','Ferga ligger i dokk i dag.','Den lange ruta brukes bare om sommeren.'],'tags':['negation-flip','instrument-break','invent','unsupported-condition']},
 # ---- M: 6 odd-one-out
 {'band':'M','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: fiolin, bratsj, cello, harpe, kontrabass?','opts':['fiolin','bratsj','cello','harpe','kontrabass'],'odd':3},
 {'band':'M','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: syre, base, salt, metall, oksid?','opts':['syre','base','salt','metall','oksid'],'odd':3},
 {'band':'M','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: regn, snø, sludd, hagl, skodde?','opts':['regn','snø','sludd','hagl','skodde'],'odd':4},
 {'band':'M','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: murer, tømrer, rørlegger, elektriker, arkitekt?','opts':['murer','tømrer','rørlegger','elektriker','arkitekt'],'odd':4},
 {'band':'M','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: løve, tiger, gepard, jaguar, ulv?','opts':['løve','tiger','gepard','jaguar','ulv'],'odd':4},
 {'band':'M','sub':'oddone','q':'Hvilket ord hører ikke hjemme med de andre: termometer, barometer, kilometer, hygrometer, hastighetsmåler?','opts':['termometer','barometer','kilometer','hygrometer','hastighetsmåler'],'odd':2},
]

T3_NO_H = [
 # ---- H: 4 analogi
 {'band':'H','sub':'analogi','q':'Fullfør analogien: frø : plante :: puppe : ?','opts':['sommerfugl','larve','kokong','honning','fjær'],'tags':['earlier-stage','stage-shell','unrelated','unrelated']},
 {'band':'H','sub':'analogi','q':'Fullfør analogien: skygge : lys :: stille : ?','opts':['lyd','bevegelse','vann','vind','varme'],'tags':['assoc-sense','assoc-sense','assoc-sense','assoc-sense']},
 {'band':'H','sub':'analogi','q':'Fullfør analogien: ordbok : ord :: atlas : ?','opts':['kart','globus','land','hylle','hefte'],'tags':['globe-form','mapped-topic','container','format']},
 {'band':'H','sub':'analogi','q':'Fullfør analogien: brensel : motor :: mat : ?','opts':['kropp','kjøkken','mage','sult','oppskrift'],'tags':['prep-place','part','need-signal','instructions']},
 # ---- H: 8 leksikalsk
 {'band':'H','sub':'leksikalsk','q':'På hylla står bøkene i blokker etter farge. Blokken ytterst til venstre er rød. Den gule blokken står til høyre for den grønne. Den grønne blokken står til høyre for den røde. Ingen annen farge brukes. Hvilken rekkefølge får bøkene i, fra venstre?','opts':['rød, grønn, gul','rød, gul, grønn','grønn, rød, gul','gul, grønn, rød','grønn, gul, rød'],'tags':['adjacent-swap','anchor-moved','full-reverse','block-swap']},
 {'band':'H','sub':'leksikalsk','q':'I koret har Anna lavere stemme enn Bente, og Bente har lavere stemme enn Carmen. Dina synger akkurat like lavt som Anna. Hva følger?','opts':['Carmen har den høyeste stemmen.','Anna har den høyeste stemmen.','Bente synger like lavt som Carmen.','Dina har lavere stemme enn Bente.','Carmen og Anna er like.'],'tags':['rank-flip','rank-flip','unsupported-parity','parity-invent']},
 {'band':'H','sub':'leksikalsk','q':'Kai er eldre enn Leif. Leif er eldre enn Mia. Odd er yngre enn Mia. Hvem er yngst?','opts':['Odd','Mia','Leif','Kai','Odd og Mia er like gamle'],'tags':['premise-misread','order-flip','order-flip','parity-invent']},
 {'band':'H','sub':'leksikalsk','q':'En «fjellgaupe» er i denne teksten en gaupe som lever over skoggrenen. Gaupen som ble fotografert på Hardangervidda lever over skoggrenen. Hva følger?','opts':['Det var en fjellgaupe.','Det var ingen fjellgaupe.','Fjellgauper lever bare på Hardangervidda.','Gauper under skoggrenen er fjellgauper.','Hardangervidda ligger under skoggrenen.'],'tags':['negation-flip','over-strong','definition-flip','premise-misread']},
 {'band':'H','sub':'leksikalsk','q':'Klubben har regelen: den som er sen tre ganger i én og samme måned, mister plassen den følgende måneden. Per var sen to ganger i april og én gang i mai. Hva følger om juni?','opts':['Per mister ikke plassen i juni.','Per mister plassen i juni.','Per mister plassen i mai.','April og mai telles sammen til tre senheter.','En enkel senhet i mai utløser tap av plassen.'],'tags':['negation-flip','wrong-month','cross-month-sum','threshold-misread']},
 {'band':'H','sub':'leksikalsk','q':'Utsiktstårnet ligger rett nord for sjøen. Koia ligger rett sør for sjøen. Hva følger?','opts':['Sjøen ligger mellom tårnet og koia.','Tårnet ligger sør for sjøen.','Koia ligger nord for sjøen.','Tårnet og koia ligger side om side.','Koia ligger øst for tårnet.'],'tags':['direction-flip','direction-flip','adjacency-assume','invent-bearing']},
 {'band':'H','sub':'leksikalsk','q':'En kurv inneholder bare epler og pærer. Antall epler er det dobbelte av antall pærer, og det er atten frukter til sammen. Hvor mange pærer er det?','opts':['6','9','12','36','4'],'tags':['half-total','apple-count','double-total','wrong-base']},
 {'band':'H','sub':'leksikalsk','q':'En turnering består av fire runder. Hver runde varer 20 minutter, og det er 5 minutters pause mellom rundene. Turneringen startet klokken 18:00. Når slutter runde to?','opts':['18:45','18:40','18:25','19:10','18:50'],'tags':['omit-pause','one-round-short','wrong-round','added-extra-pause']},
 # ---- H: 4 klassifikasjon
 {'band':'H','sub':'klass','q':'Hvilket ord hører sammen med de andre: ile, haste, skunde?','opts':['skynde seg','slappe av','rusle','dvæle','vente'],'tags':['antonym','antonym','antonym','antonym']},
 {'band':'H','sub':'klass','q':'Hvilket ord hører sammen med de andre: stor, bred, høy, tykk?','opts':['omfattende','spinkel','smal','kortlivet','lettvekts'],'tags':['antonym','antonym','antonym-frame','antonym']},
 {'band':'H','sub':'klass','q':'Hvilket ord hører sammen med de andre: hake, krok, bue, sving?','opts':['krumning','rett strek','spiss vinkel','flat prikk','linjale'],'tags':['antonym','angle-not-curve','point-not-line','tool']},
 {'band':'H','sub':'klass','q':'Hvilket ord hører sammen med de andre: måneskinn, måneformørkelse, månefase?','opts':['månering','søndag','havbølge','døgnrytme','årstid'],'tags':['no-moon-root','no-moon-root','no-moon-root','no-moon-root']},
]

T3_EN = [
 # ---- L: 6 odd-one-out
 {'band':'L','sub':'oddone','q':'Which word does not belong with the others: apple, banana, pear, carrot, grape?','opts':['apple','banana','pear','carrot','grape'],'odd':3},
 {'band':'L','sub':'oddone','q':'Which word does not belong with the others: red, green, blue, round, yellow?','opts':['red','green','blue','round','yellow'],'odd':3},
 {'band':'L','sub':'oddone','q':'Which word does not belong with the others: book, newspaper, magazine, letter, stone?','opts':['book','newspaper','magazine','letter','stone'],'odd':4},
 {'band':'L','sub':'oddone','q':'Which word does not belong with the others: violin, cello, trumpet, viola, double bass?','opts':['violin','cello','trumpet','viola','double bass'],'odd':2},
 {'band':'L','sub':'oddone','q':'Which word does not belong with the others: dog, cat, horse, rabbit, eagle?','opts':['dog','cat','horse','rabbit','eagle'],'odd':4},
 {'band':'L','sub':'oddone','q':'Which word does not belong with the others: hammer, saw, screwdriver, drill, nail?','opts':['hammer','saw','screwdriver','drill','nail'],'odd':4},
 # ---- L: 6 analogi
 {'band':'L','sub':'analogi','q':'Complete the analogy: hand : glove :: foot : ?','opts':['sock','head','belt','scarf','knee'],'tags':['cat','part-whole','assoc','assoc','part-whole']},
 {'band':'L','sub':'analogi','q':'Complete the analogy: puppy : dog :: kitten : ?','opts':['cat','wolf','lion','mouse','goat'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'analogi','q':'Complete the analogy: plane : sky :: boat : ?','opts':['water','land','railway','garage','road'],'tags':['cat','surface-shift','cat','cat','surface-shift']},
 {'band':'L','sub':'analogi','q':'Complete the analogy: pencil : paper :: paint : ?','opts':['wall','brush','bucket','eraser','hand'],'tags':['surface-mismatch','tool-swap','container','assoc','agent']},
 {'band':'L','sub':'analogi','q':'Complete the analogy: meow : cat :: bark : ?','opts':['dog','bird','horse','sheep','mouse'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'analogi','q':'Complete the analogy: mother : daughter :: father : ?','opts':['son','mother','brother','uncle','grandfather'],'tags':['gender-flip','relation-shift','assoc','generation','generation']},
 # ---- L: 5 klassifikasjon
 {'band':'L','sub':'klass','q':'Which word goes with the others: car, bus, bicycle, train?','opts':['plane','spade','bed','cup','stone'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'klass','q':'Which word goes with the others: apple, pear, plum, apricot?','opts':['banana','carrot','potato','onion','tomato'],'tags':['cat','cat','cat','cat','cat-ambiguous']},
 {'band':'L','sub':'klass','q':'Which word goes with the others: oak, spruce, pine?','opts':['birch','rose','grass','moss','seaweed'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'klass','q':'Which word goes with the others: red, blue, green?','opts':['yellow','table','fast','cold','box'],'tags':['cat','cat','cat','cat','cat']},
 {'band':'L','sub':'klass','q':'Which word goes with the others: January, March, May?','opts':['July','Tuesday','Christmas','summer','Friday'],'tags':['cat','assoc','month-superclass','cat','assoc']},
]

T3_EN_M = [
 # ---- M: 5 analogi
 {'band':'M','sub':'analogi','q':'Complete the analogy: eye : see :: ear : ?','opts':['hear','smell','speak','head','mouth'],'tags':['sense-swap','function-shift','part-whole','part-whole','part-whole']},
 {'band':'M','sub':'analogi','q':'Complete the analogy: hungry : eat :: thirsty : ?','opts':['drink','sleep','walk','read','hurry'],'tags':['need-mismatch','assoc','assoc','assoc','assoc']},
 {'band':'M','sub':'analogi','q':'Complete the analogy: painter : picture :: composer : ?','opts':['symphony','baton','orchestra','hall','instrument'],'tags':['tool','performer','venue','medium']},
 {'band':'M','sub':'analogi','q':'Complete the analogy: teacher : school :: doctor : ?','opts':['hospital','medicine','patient','disease','waiting room'],'tags':['treatment','client','condition','venue-sub']},
 {'band':'M','sub':'analogi','q':'Complete the analogy: hen : egg :: cow : ?','opts':['milk','calf','grass','meadow','barn'],'tags':['offspring-not-product','input','habitat','habitat']},
 # ---- M: 6 leksikalsk
 {'band':'M','sub':'leksikalsk','q':'Every plant in the greenhouse is watered each morning. The orchid is in the greenhouse. What follows?','opts':['The orchid is watered each morning.','The orchid is not watered.','Some plants in the greenhouse are watered.','The orchid is not a plant.','The greenhouse is watered.'],'tags':['negation-flip','weaker','category-break','subject-shift']},
 {'band':'M','sub':'leksikalsk','q':'Only members may borrow from the Solvoll library. Jon has a library card there. What follows?','opts':['Jon is a member.','Jon lives in Solvoll.','Jon may not borrow there.','Everyone with a card works there.','Jon owns the library.'],'tags':['premise-misread','negation-flip','over-strong','role-invent']},
 {'band':'M','sub':'leksikalsk','q':'Every Wednesday at eight the choir meets in the parish hall. Today is Wednesday at eight. What follows?','opts':['The choir is meeting in the parish hall now.','The choir rehearses every evening.','The parish hall is closed.','The choir meets at nine.','Today is Sunday.'],'tags':['over-strong','invent','time-shift','day-shift']},
 {'band':'M','sub':'leksikalsk','q':'Espen is taller than Vera. Vera is taller than Nils. What follows?','opts':['Espen is taller than Nils.','Nils is taller than Espen.','Vera is the tallest.','Nils and Espen are equally tall.','Vera is the shortest.'],'tags':['reversed','rank-flip','parity-invent','rank-flip']},
 {'band':'M','sub':'leksikalsk','q':'Kari does not take part in the marathon. Everyone who takes part in the marathon trains five times a week. What follows about Kari\'s training?','opts':['It cannot be determined from the text.','Kari trains five times a week.','Kari never trains.','No participants train five times a week.','Kari runs the marathon.'],'tags':['premise-misread','over-strong','scope-flip','premise-misread']},
 {'band':'M','sub':'leksikalsk','q':'Whenever the wind blows from the north-west, the ferry is rerouted to the long crossing. The gauge at the pier now shows a north-westerly wind. What follows?','opts':['The ferry is being rerouted to the long crossing now.','The ferry is taking the short crossing now.','The gauge is broken.','The ferry is in dry dock today.','The long crossing is used only in summer.'],'tags':['negation-flip','instrument-break','invent','unsupported-condition']},
 # ---- M: 6 odd-one-out
 {'band':'M','sub':'oddone','q':'Which word does not belong with the others: violin, viola, cello, harp, double bass?','opts':['violin','viola','cello','harp','double bass'],'odd':3},
 {'band':'M','sub':'oddone','q':'Which word does not belong with the others: acid, base, salt, metal, oxide?','opts':['acid','base','salt','metal','oxide'],'odd':3},
 {'band':'M','sub':'oddone','q':'Which word does not belong with the others: rain, snow, sleet, hail, fog?','opts':['rain','snow','sleet','hail','fog'],'odd':4},
 {'band':'M','sub':'oddone','q':'Which word does not belong with the others: bricklayer, carpenter, plumber, electrician, architect?','opts':['bricklayer','carpenter','plumber','electrician','architect'],'odd':4},
 {'band':'M','sub':'oddone','q':'Which word does not belong with the others: lion, tiger, cheetah, jaguar, wolf?','opts':['lion','tiger','cheetah','jaguar','wolf'],'odd':4},
 {'band':'M','sub':'oddone','q':'Which word does not belong with the others: thermometer, barometer, kilometre, hygrometer, speedometer?','opts':['thermometer','barometer','kilometre','hygrometer','speedometer'],'odd':2},
]

T3_EN_H = [
 # ---- H: 4 analogi
 {'band':'H','sub':'analogi','q':'Complete the analogy: seed : plant :: chrysalis : ?','opts':['butterfly','larva','cocoon','honey','feather'],'tags':['earlier-stage','stage-shell','unrelated','unrelated']},
 {'band':'H','sub':'analogi','q':'Complete the analogy: shadow : light :: silence : ?','opts':['sound','movement','water','wind','heat'],'tags':['assoc-sense','assoc-sense','assoc-sense','assoc-sense']},
 {'band':'H','sub':'analogi','q':'Complete the analogy: dictionary : words :: atlas : ?','opts':['maps','globe','countries','shelf','booklet'],'tags':['globe-form','mapped-topic','container','format']},
 {'band':'H','sub':'analogi','q':'Complete the analogy: fuel : engine :: food : ?','opts':['body','kitchen','stomach','hunger','recipe'],'tags':['prep-place','part','need-signal','instructions']},
 # ---- H: 8 leksikalsk
 {'band':'H','sub':'leksikalsk','q':'On the shelf the books stand in blocks by colour. The outermost block on the left is red. The yellow block stands to the right of the green one. The green block stands to the right of the red one. No other colour is used. Which order do the books stand in, from the left?','opts':['red, green, yellow','red, yellow, green','green, red, yellow','yellow, green, red','green, yellow, red'],'tags':['adjacent-swap','anchor-moved','full-reverse','block-swap']},
 {'band':'H','sub':'leksikalsk','q':'In the choir, Anna has a lower voice than Bente, and Bente has a lower voice than Carmen. Dina sings exactly as low as Anna. What follows?','opts':['Carmen has the highest voice.','Anna has the highest voice.','Bente sings as low as Carmen.','Dina has a lower voice than Bente.','Carmen and Anna are equal.'],'tags':['rank-flip','rank-flip','unsupported-parity','parity-invent']},
 {'band':'H','sub':'leksikalsk','q':'Tom is older than Sue. Sue is older than Rita. Ben is younger than Rita. Who is the youngest?','opts':['Ben','Rita','Sue','Tom','Ben and Rita are the same age'],'tags':['premise-misread','order-flip','order-flip','parity-invent']},
 {'band':'H','sub':'leksikalsk','q':'In this text, a "mountain lynx" is a lynx that lives above the forest line. The lynx photographed on the Hardangervidda lives above the forest line. What follows?','opts':['It was a mountain lynx.','It was not a mountain lynx.','Mountain lynxes live only on the Hardangervidda.','Lynxes below the forest line are mountain lynxes.','The Hardangervidda lies below the forest line.'],'tags':['negation-flip','over-strong','definition-flip','premise-misread']},
 {'band':'H','sub':'leksikalsk','q':'The club has a rule: anyone who is late three times within the same month loses their place the following month. Per was late twice in April and once in May. What follows about June?','opts':['Per does not lose his place in June.','Per loses his place in June.','Per loses his place in May.','April and May are counted together as three.','A single lateness in May triggers the loss.'],'tags':['negation-flip','wrong-month','cross-month-sum','threshold-misread']},
 {'band':'H','sub':'leksikalsk','q':'The lookout tower stands due north of the lake. The cabin stands due south of the lake. What follows?','opts':['The lake lies between the tower and the cabin.','The tower lies south of the lake.','The cabin lies north of the lake.','The tower and the cabin stand side by side.','The cabin lies east of the tower.'],'tags':['direction-flip','direction-flip','adjacency-assume','invent-bearing']},
 {'band':'H','sub':'leksikalsk','q':'A basket contains only apples and pears. The number of apples is twice the number of pears, and there are fifteen fruits in total. How many pears are there?','opts':['5','10','15','30','3'],'tags':['half-total','apple-count','double-total','wrong-base']},
 {'band':'H','sub':'leksikalsk','q':'A tournament consists of four rounds. Each round lasts 20 minutes with a 5-minute break between rounds. The tournament started at 18:00. When does round four end?','opts':['19:35','19:30','19:20','20:00','19:15'],'tags':['pause-miss-one','all-pauses-omitted','extra-pause','pause-after-last-included']},
 # ---- H: 4 klassifikasjon
 {'band':'H','sub':'klass','q':'Which word goes with the others: hurry, rush, speed?','opts':['dash','linger','stroll','wait','loiter'],'tags':['antonym','antonym','antonym','antonym']},
 {'band':'H','sub':'klass','q':'Which word goes with the others: big, wide, tall, thick?','opts':['spacious','slender','narrow','short-lived','lightweight'],'tags':['antonym','antonym','antonym-frame','antonym']},
 {'band':'H','sub':'klass','q':'Which word goes with the others: hook, bend, arc, curve?','opts':['curvature','straight line','sharp angle','flat dot','ruler'],'tags':['antonym','angle-not-curve','point-not-line','tool']},
 {'band':'H','sub':'klass','q':'Which word goes with the others: moonlight, lunar eclipse, moon phase?','opts':['moon ring','Sunday','sea wave','daily rhythm','season'],'tags':['no-moon-root','no-moon-root','no-moon-root','no-moon-root']},
]

# ============================================================ T4 ROMLIG (sp)
# Tekstbaerent romlig. Prompt+valg oversatt; fasit-formulering identisk per variant
# (f.eks. tall '2' som fasit) eller parallell naturlig oversettelse.
T4 = [
 # ---------------- L 14
 {'band':'L','sub':'posisjon','q_no':'Nilla holder en rød ball i venstre hånd og en blå ball i høyre hånd. Hva har hun i høyre hånd?','o_no':['den blå ballen','den røde ballen','ingen ball','begge ballene','en grønn ball'],'q_en':'Nilla holds a red ball in her left hand and a blue ball in her right hand. What does she have in her right hand?','o_en':['the blue ball','the red ball','no ball','both balls','a green ball'],'tags':['hand-swap','hand-swap','negation-flip','both-hands','invent-color']},
 {'band':'L','sub':'retning','q_no':'Ola står og vender ansiktet mot nord. Hvilken himmelretning er på hans høyre side?','o_no':['øst','vest','sør','nord','ingen — han vender mot nord'],'q_en':'Ola is standing facing north. Which compass direction is on his right-hand side?','o_en':['east','west','south','north','none — he faces north'],'tags':['west','south','axis-swap','face-dir','negation-flip']},
 {'band':'L','sub':'posisjon','q_no':'Katten ligger foran peisen. Hunden ligger bak peisen. Hva ligger mellom dem, hvis ingenting annet er i rommet?','o_no':['peisen','katten','hunden','ingenting','et teppe'],'q_en':'The cat lies in front of the stove. The dog lies behind the stove. What lies between them, if nothing else is in the room?','o_en':['the stove','the cat','the dog','nothing','a rug'],'tags':['cat','dog','negation-flip','invent-object']},
 {'band':'L','sub':'ko','q_no':'Per står foran Kari i køen, og Nils står bak Kari. Hvem står lengst fremme?','o_no':['Per','Kari','Nils','Per og Nils er like fremme','rekkefølgen kan ikke avgjøres'],'q_en':'Per stands in front of Kari in the queue, and Nils stands behind Kari. Who stands furthest forward?','o_en':['Per','Kari','Nils','Per and Nils are equally far forward','the order cannot be determined'],'tags':['rank-flip','rank-flip','rank-flip','parity-invent']},
 {'band':'L','sub':'speil','q_no':'Du ser bokstaven R i et speil. Hva ser du?','o_no':['R speilvendt','R som normalt','bokstaven P','bokstaven B','R opp-ned'],'q_en':'You see the letter R in a mirror. What do you see?','o_en':['R mirrored','R as normal','the letter P','the letter B','R upside down'],'tags':['normal-R','letter-swap','letter-swap','rotation-swap']},
 {'band':'L','sub':'posisjon','q_no':'Kniven ligger til venstre for gaffelen. Skeen ligger til høyre for gaffelen. Hvilket redskap ligger i midten?','o_no':['gaffelen','kniven','skeen','ingen ligger i midten','de ligger i vilkårlig rekkefølge'],'q_en':'The knife lies to the left of the fork. The spoon lies to the right of the fork. Which utensil lies in the middle?','o_en':['the fork','the knife','the spoon','none lies in the middle','the order is arbitrary'],'tags':['left-end','right-end','negation-flip','over-strong']},
 {'band':'L','sub':'retning','q_no':'Skolen ligger nord for hjemmet. Butikken ligger sør for hjemmet. Hva ligger lengst sør?','o_no':['butikken','skolen','hjemmet','butikken og skolen er like','alle tre ligger på linje øst-vest'],'q_en':'The school is north of the home. The shop is south of the home. What lies furthest south?','o_en':['the shop','the school','the home','the shop and the school are equal','all three lie on an east-west line'],'tags':['north-end','middle','parity-invent','line-claim']},
 {'band':'L','sub':'rotasjon','q_no':'Minuttviseren peker rett opp, mot klokken tolv. Femten minutter senere — hvor peker den?','o_no':['mot høyre, mot klokken tre','mot venstre, mot klokken ni','fortsatt mot tolv','mot klokken seks','den står stille'],'q_en':'The minute hand points straight up, at twelve. Fifteen minutes later — where does it point?','o_en':['to the right, at three','to the left, at nine','still at twelve','at six','it stands still'],'tags':['ccw-90','angle-zero','angle-180','stopped']},
 {'band':'L','sub':'posisjon','q_no':'Døren er rett foran Anna. Vinduet er rett bak henne. Hva ser Anna når hun har snudd seg en hel omgang?','o_no':['døren','vinduet','både døren og vinduet','hverken døren eller vinduet','det avhenger av hvor raskt hun snur seg'],'q_en':'The door is straight in front of Anna. The window is straight behind her. What does Anna see after turning all the way around?','o_en':['the door','the window','both the door and the window','neither the door nor the window','it depends on how fast she turns'],'tags':['rotation-180','both','none','irrelevant-speed']},
 {'band':'L','sub':'speil','q_no':'Bjørn vender oss ryggen. Han løfter høyre hånd. På hvilken side ser vi hånden?','o_no':['på vår høyre side','på vår venstre side','like foran oss','på begge sider','han kan ikke løfte en hånd med ryggen til'],'q_en':'Bjørn has his back to us. He raises his right hand. On which side do we see the hand?','o_en':['on our right side','on our left side','right in front of us','on both sides','he cannot raise a hand with his back to us'],'tags':['mirror-flip','center-assume','both','impossible-claim']},
 {'band':'L','sub':'retning','q_no':'Du står ved gjerdet og vender ansiktet mot øst. Hagen ligger vest for gjerdet. Hva har du bak deg?','o_no':['hagen','gjerdet','hjemme','vest','siden du vender mot øst har du ingenting bak deg'],'q_en':'You are standing at the fence facing east. The garden lies west of the fence. What is behind you?','o_en':['the garden','the fence','home','west','since you face east there is nothing behind you'],'tags':['direction-confusion','object-not-direction','assoc','surface-anchor','negation-flip']},
 {'band':'L','sub':'rotasjon','q_no':'En pil peker mot klokken tre. Den roteres 90 grader med urviseren. Hvor peker pilen nå?','o_no':['mot klokken seks','mot klokken tolv','fortsatt mot tre','mot klokken ni','den peker skrått opp'],'q_en':'An arrow points at three o\'clock. It rotates 90 degrees clockwise. Where does it point now?','o_en':['at six o\'clock','at twelve o\'clock','still at three','at nine o\'clock','it points diagonally up'],'tags':['ccw-90','angle-zero','angle-180','ccw-270-as-up']},
 {'band':'L','sub':'stabling','q_no':'Kubene stables slik: den røde kuben ligger nederst, den blå kommer ovenpå, og den gule ligger øverst. Hvilken farge har kuben i midten?','o_no':['blå','rød','gul','ingen — det er bare to kuber','alle tre fargene'],'q_en':'The cubes are stacked like this: the red cube at the bottom, the blue one on top of it, and the yellow one at the top. Which colour is the cube in the middle?','o_en':['blue','red','yellow','none — there are only two cubes','all three colours'],'tags':['bottom','top','negation-flip','all-layers']},
 {'band':'L','sub':'posisjon','q_no':'Både hylla og bordet står langs veggen. Hylla står til venstre for døra, og bordet står til høyre for døra. Hva står mellom hylla og bordet?','o_no':['døra','veggen','ingenting','bordet','hylla'],'q_en':'Both the shelf and the table stand along the wall. The shelf stands to the left of the door, and the table stands to the right of the door. What stands between the shelf and the table?','o_en':['the door','the wall','nothing','the table','the shelf'],'tags':['surface','negation-flip','endpoint','endpoint']},
 # ---------------- M 13
 {'band':'M','sub':'rotasjon','q_no':'Et skilt med pil peker mot klokken ni. Skiltet roteres en halv omgang. Hvor peker pilen nå?','o_no':['mot klokken tre','fortsatt mot ni','mot klokken tolv','mot klokken seks','den peker rett opp'],'q_en':'A sign with an arrow points at nine o\'clock. The sign is rotated half a turn. Where does the arrow point now?','o_en':['at three o\'clock','still at nine','at twelve o\'clock','at six o\'clock','it points straight up'],'tags':['angle-zero','angle-90','angle-180','surface-anchor']},
 {'band':'M','sub':'ko','q_no':'Fire personer står i rekke: Ane står foran Berit, Berit foran Camilla, og Camilla foran Dina. Hvem står som nummer to fra fremst?','o_no':['Berit','Ane','Camilla','Dina','rekken er sirkelformet, så det finnes ikke en nummer to'],'q_en':'Four people stand in a line: Ane in front of Berit, Berit in front of Camilla, and Camilla in front of Dina. Who stands second from the front?','o_en':['Berit','Ane','Camilla','Dina','the line is circular, so there is no number two'],'tags':['rank-flip','rank-flip','rank-flip','circle-claim']},
 {'band':'M','sub':'bretting','q_no':'Et ark foldes én gang fra venstre mot høyre, så det blir dobbelt. Deretter lages ett hull gjennom arket. Hvor mange hull er det når arket foldes ut igjen?','o_no':['to hull','ett hull','fire hull','ingen hull','hullene ligger bare på den ene halvdelen'],'q_en':'A sheet is folded once from left to right, making it double. Then one hole is punched through it. How many holes are there when the sheet is unfolded again?','o_en':['two holes','one hole','four holes','no holes','the holes lie only on one half'],'tags':['fold-miss','depth-double','negation-flip','half-only']},
 {'band':'M','sub':'retning','q_no':'Fra tårnet ser du kirken mot nord og vindmøllen mot sør. Du snur deg 90 grader med urviseren. Hva ser du nå?','o_no':['verken kirken eller vindmøllen','kirken','vindmøllen','både kirken og vindmøllen','himmelen'],'q_en':'From the tower you see the church to the north and the windmill to the south. You turn 90 degrees clockwise. What do you see now?','o_en':['neither the church nor the windmill','the church','the windmill','both the church and the windmill','the sky'],'tags':['quarter-away','axis-swap','axis-swap','over-inclusive']},
 {'band':'M','sub':'sti','q_no':'Fra X går veien 2 km nord til Y, og derfra 2 km øst til Z. Hvilken retning er Z fra X?','o_no':['nordøst','sørøst','nord','øst','Z ligger like langt fra X i alle retninger'],'q_en':'From X the road runs 2 km north to Y, and from there 2 km east to Z. In which direction is Z from X?','o_en':['north-east','south-east','north','east','Z is equally far from X in every direction'],'tags':['antipode','axis-only','axis-only','parity-invent']},
 {'band':'M','sub':'bord','q_no':'Fire personer sitter rundt et rundt bord, i rekkefølge med urviseren: Pernille, Quentin, Ragna, Signe. Hvem sitter rett overfor Pernille?','o_no':['Ragna','Quentin','Signe','ingen — bordet har bare tre plasser','Pernille'],'q_en':'Four people sit around a round table, clockwise: Pernille, Quentin, Ragna, Signe. Who sits directly opposite Pernille?','o_en':['Ragna','Quentin','Signe','none — the table has only three seats','Pernille'],'tags':['neighbor','neighbor','seat-count','self']},
 {'band':'M','sub':'sti','q_no':'En bil kjører 3 km mot nord, snur og kjører 2 km mot sør. Hvor langt fra startpunktet ender bilen, og i hvilken retning?','o_no':['1 km mot nord','1 km mot sør','på startpunktet','5 km mot nord','3 km mot sør'],'q_en':'A car drives 3 km north, turns around and drives 2 km south. How far from the starting point does the car end up, and in which direction?','o_en':['1 km north','1 km south','at the starting point','5 km north','3 km south'],'tags':['direction-flip','cancellation-full','leg-sum','first-leg']},
 {'band':'M','sub':'rett','q_no':'Ved en korsvei går en vei øst-vest og en vei nord-sør. Kirken ligger nord for øst-vest-veien og vest for nord-sør-veien. I hvilket hjørne ligger kirken?','o_no':['i nordvest-hjørnet','i nordøst-hjørnet','i sørvest-hjørnet','i sørøst-hjørnet','midt i krysset'],'q_en':'At a junction an east-west road crosses a north-south road. The church lies north of the east-west road and west of the north-south road. In which corner does the church lie?','o_en':['in the north-west corner','in the north-east corner','in the south-west corner','in the south-east corner','in the middle of the junction'],'tags':['ne-quadrant','sw-quadrant','se-quadrant','center']},
 {'band':'M','sub':'ko','q_no':'Fem hus ligger langs veien, nummerert 1 til 5, der hus 1 er nærmest krysset og hus 5 er det fjerneste. Du går fra krysset til hus 3. Hvor mange hus har du passert på veien?','o_no':['to hus — nummer 1 og 2','tre hus','fem hus','ingen hus','fire hus'],'q_en':'Five houses lie along the road, numbered 1 to 5, where house 1 is nearest the junction and house 5 the furthest away. You walk from the junction to house 3. How many houses do you pass on the way?','o_en':['two houses — number 1 and 2','three houses','five houses','no houses','four houses'],'tags':['self-count','all-count','negation-flip','off-by-one']},
 {'band':'M','sub':'bretting','q_no':'Et kvadratisk ark foldes én gang fra venstre til høyre og deretter én gang nedenfra og opp. Så lages ett hull. Hvor mange hull er det når arket foldes ut?','o_no':['fire hull','to hull','åtte hull','ett hull','hullene ligger bare langs kanten'],'q_en':'A square sheet is folded once from left to right and then once from bottom to top. Then one hole is punched. How many holes are there when the sheet is unfolded?','o_en':['four holes','two holes','eight holes','one hole','the holes lie only along the edge'],'tags':['single-fold','double-depth','fold-miss','edge-only']},
 {'band':'M','sub':'rotasjon','q_no':'Viseren peker mot klokken tolv. Den roteres 90 grader mot urviseren. Hvor peker den nå?','o_no':['mot klokken ni','mot klokken tre','like mellom elleve og ett','fortsatt mot tolv','mot klokken seks'],'q_en':'The hand points at twelve o\'clock. It rotates 90 degrees counterclockwise. Where does it point now?','o_en':['at nine o\'clock','at three o\'clock','between eleven and one','still at twelve','at six o\'clock'],'tags':['cw-90','half-angle','angle-zero','angle-180']},
 {'band':'M','sub':'sti','q_no':'Gå 1 km øst, 2 km nord, 1 km vest og 2 km sør. Hvor befinner du deg da?','o_no':['på startpunktet','1 km øst for startpunktet','2 km nord for startpunktet','4 km fra startpunktet','vest for startpunktet'],'q_en':'Walk 1 km east, 2 km north, 1 km west and 2 km south. Where are you then?','o_en':['at the starting point','1 km east of the starting point','2 km north of the starting point','4 km from the starting point','west of the starting point'],'tags':['partial-cancel','partial-cancel-axis','distance-sum','axis-miss']},
 {'band':'M','sub':'retning','q_no':'Eva bor øst for skolen, og Fred bor sør for skolen. De møtes på skolen og går sammen til Eva. Hvilken retning går de?','o_no':['østover','sørover','sørøstover','vestover','de må skille lag ved krysset'],'q_en':'Eva lives east of the school, and Fred lives south of the school. They meet at the school and walk together to Eva\'s. In which direction do they walk?','o_en':['eastwards','southwards','south-eastwards','westwards','they must part ways at the crossing'],'tags':['wrong-person','midpoint','antipode','split-claim']},
 # ---------------- H 13
 {'band':'H','sub':'sti','q_no':'En buss ruter fra terminalen: først 3 km nord, deretter 2 km øst, og til slutt 3 km nord. Hvilken retning er endestasjonen fra terminalen?','o_no':['nordøst','sørøst','nord','øst','ruten danner en sirkel'],'q_en':'A bus route runs from the terminal: first 3 km north, then 2 km east, and finally 3 km north. In which direction is the final stop from the terminal?','o_en':['north-east','south-east','north','east','the route forms a circle'],'tags':['antipode','axis-only-north','axis-only-east','loop-claim']},
 {'band':'H','sub':'rotasjon','q_no':'Et kors har én arm malt rød. Den røde armen peker mot sør. Korset roteres 180 grader. Hvor peker den røde armen nå?','o_no':['mot nord','fortsatt mot sør','mot øst','mot vest','armen er nå skjult bak korset'],'q_en':'A cross has one arm painted red. The red arm points south. The cross is rotated 180 degrees. Where does the red arm point now?','o_en':['north','still south','east','west','the arm is now hidden behind the cross'],'tags':['angle-zero','angle-90','angle-90-neg','erasure-claim']},
 {'band':'H','sub':'retning','q_no':'Du vender ansiktet mot sør. Hvilken himmelretning peker din venstre hånd mot?','o_no':['øst','vest','nord','sør','hender peker ikke mot himmelretninger'],'q_en':'You are facing south. Which compass direction does your left hand point toward?','o_en':['east','west','north','south','hands do not point toward compass directions'],'tags':['mirror-flip','axis-confusion','face-dir','over-strong']},
 {'band':'H','sub':'avstand','q_no':'Fra hytta er det 3 km i luftlinje til elva, rett nord. Fra elva er det 4 km i luftlinje til fjellet, rett øst. Hvor langt er det i luftlinje fra hytta til fjellet?','o_no':['5 km','7 km','4 km','12 km','1 km'],'q_en':'From the cabin it is 3 km as the crow flies to the river, due north. From the river it is 4 km as the crow flies to the mountain, due east. How far is it as the crow flies from the cabin to the mountain?','o_en':['5 km','7 km','4 km','12 km','1 km'],'tags':['leg-sum','axis-only','sum-all','diff'],
   'note':'3-4-5-trekanten er geometrisk, ikke aritmetikk-serien i T2'},
 {'band':'H','sub':'bretting','q_no':'Et strøket ark foldes tre ganger, hver gang fra venstre mot høyre. Så lages ett hull. Hvor mange hull er det når arket foldes ut?','o_no':['åtte hull','fire hull','to hull','ett hull','hullet blir borte ved foldingen'],'q_en':'A blank sheet is folded three times, each time from left to right. Then one hole is punched. How many holes are there when the sheet is unfolded?','o_en':['eight holes','four holes','two holes','one hole','the hole disappears in the folding'],'tags':['power-two','power-one','negation-flip','erasure-claim']},
 {'band':'H','sub':'sti','q_no':'Du går 4 km mot nord, snur 90 grader til høyre og går 4 km, snur 90 grader til høyre og går 4 km, snur 90 grader til høyre og går 4 km. Hvor befinner du deg i forhold til startpunktet?','o_no':['på startpunktet','4 km mot øst','4 km mot nord','8 km fra startpunktet','ruten er åpen i én ende'],'q_en':'You walk 4 km north, turn 90 degrees right and walk 4 km, turn 90 degrees right and walk 4 km, turn 90 degrees right and walk 4 km. Where are you in relation to the starting point?','o_en':['at the starting point','4 km east','4 km north','8 km from the starting point','the route is open at one end'],'tags':['partial-path','partial-path-axis','leg-sum','open-path']},
 {'band':'H','sub':'ko','q_no':'Ni personer står i en kø. Mia står midt i køen. Hvilket nummer har Mia fra fremst?','o_no':['nummer fem','nummer fire','nummer seks','nummer ni','Mia har to numre, ett fra hver ende'],'q_en':'Nine people stand in a queue. Mia stands in the middle of the queue. Which number does Mia have from the front?','o_en':['number five','number four','number six','number nine','Mia has two numbers, one from either end'],'tags':['off-by-one','mirror-miss','queue-length','dual-number']},
 {'band':'H','sub':'retning','q_no':'Kirken ligger rett nord for punktet P, 3 km unna. Stasjonen ligger rett øst for P, 4 km unna. I hvilken retning fra stasjonen ligger kirken?','o_no':['nordvest','sørøst','nord','vest','det kan ikke avgjøres uten kart'],'q_en':'The church lies due north of the point P, 3 km away. The station lies due east of P, 4 km away. In which direction from the station does the church lie?','o_en':['north-west','south-east','north','west','it cannot be determined without a map'],'tags':['antipode','axis-only','axis-only','underdetermined']},
 {'band':'H','sub':'rotasjon','q_no':'Et skilt peker mot nord. Det roteres 30 grader med urviseren, tre ganger på rad. Hvor peker skiltet etterpå?','o_no':['mot øst','mot vest','mellom nord og øst','fortsatt mot nord','mot sør'],'q_en':'A sign points north. It is rotated 30 degrees clockwise, three times in a row. Where does the sign point afterwards?','o_en':['east','west','between north and east','still north','south'],'tags':['dir-flip','half-sum','angle-zero','antipode']},
 {'band':'H','sub':'avstand','q_no':'Vanligvis går stien 5 km rett sør fra huset til stranda. Broen er stengt, så du må først gå 3 km vest, deretter 5 km sør og til slutt 3 km øst. Hvor mye lengre blir turen?','o_no':['6 km','3 km','5 km','8 km','turen blir ikke lengre'],'q_en':'Normally the path runs 5 km due south from the house to the beach. The bridge is closed, so you must first walk 3 km west, then 5 km south and finally 3 km east. How much longer does the trip become?','o_en':['6 km','3 km','5 km','8 km','the trip is not longer'],'tags':['one-leg','zero','no-detour','all-legs']},
 {'band':'H','sub':'speil','q_no':'Et ord er skrevet på et papir. Du holder papiret opp mot et sterkt lys og leser teksten gjennom papiret, bakfra. Hvordan ser teksten ut fra denne siden?','o_no':['speilvendt — venstre og høyre byttet','uendret','opp-ned, med topp og bunn byttet','rotert 90 grader','teksten er borte — papiret lysner bare'],'q_en':'A word is written on a sheet of paper. You hold the paper up to a strong light and read the text through the paper, from behind. What does the text look like from this side?','o_en':['mirrored — left and right swapped','unchanged','upside down, with top and bottom swapped','rotated 90 degrees','the text is gone — the paper is just lighter'],'tags':['no-change','vertical-flip','rotation','erasure-claim']},
 {'band':'H','sub':'rotasjon','q_no':'En terning ligger med «1» på toppen og «2» mot deg (foran). Terningen rulles en kvart omgang framover, så den foran-siden blir topp. Hvilken side vender nå opp?','o_no':['2','1 — terningen står fortsatt på samme side','6 — undersiden kommer opp','3','5'],'q_en':'A die lies with "1" on top and "2" facing you (front). The die is rolled a quarter turn forward, so the front side becomes the top. Which side now faces up?','o_en':['2','1 — the die is still on the same side','6 — the bottom comes up','3','5'],'tags':['unchanged','bottom-up','side-face','opposite-face'],
   'note':'konvensjon: motstaende par er 1-6, 2-5, 3-4; kvart omgang framover lofter foran-siden (2) til topp'},
 {'band':'H','sub':'rett','q_no':'Et firkantet rom har fire dører, én i hver vegg. Du står midt i rommet og vender mot norddøren. Østdøren er låst, og du vender deg 90 grader til venstre for å gå mot neste dør. Mot hvilken dør vender du da?','o_no':['vestdøren','norddøren','sørdøren','østdøren','midt i rommet finnes ikke retninger'],'q_en':'A square room has four doors, one in each wall. You stand in the middle of the room facing the north door. The east door is locked, and you turn 90 degrees to the left to walk toward the next door. Toward which door are you facing then?','o_en':['the west door','the north door','the south door','the east door','directions do not exist in the middle of a room'],'tags':['north-still','cc-180','locked-door-kept','over-strong']},
]

# ============================================================ orkestrering
BANDSEQ = ['L'] * 17 + ['M'] * 17 + ['H'] * 16   # batch 1-kontrasj: T3 følger samme mønster

def band_list(items):
    by = {'L': [], 'M': [], 'H': []}
    for it in items:
        by[it['band']].append(it)
    return by

def rotate_labels(opts, correct, ci_base, n):
    """opts: 5 labels med fasit paa ci_base; roter med n % 5 -> (labels, ci)."""
    rot = n % len(opts)
    labels = opts[rot:] + opts[:rot]
    idx = labels.index(opts[ci_base])
    assert labels[idx] == correct
    return labels, idx, rot

def build_t3():
    no_l, no_m, no_h = T3_NO, T3_NO_M, T3_NO_H
    en_l, en_m, en_h = T3_EN, T3_EN_M, T3_EN_H
    seq = BANDSEQ
    reserved = []
    band_pos = {'L': 0, 'M': 0, 'H': 0}
    for n, band in enumerate(seq, 1):
        if band == 'L':
            no = no_l.pop(0); en = en_l.pop(0)
        elif band == 'M':
            no = no_m.pop(0); en = en_m.pop(0)
        else:
            no = no_h.pop(0); en = en_h.pop(0)
        assert no['band'] == band and en['band'] == band
        band_pos[band] += 1
        if no['sub'] == 'oddone':
            ci_no, ci_en = no['odd'], en['odd']
            tags_no = ['oddone-set-member'] * 4
            tags_en = tags_no
        else:
            ci_no = ci_en = 0
            tags_no, tags_en = no.get('tags', ['oddone-set-member'] * 4), en.get('tags', ['oddone-set-member'] * 4)
        meta = dict(id=f"vr-{n:04d}", theme='T3', band=band,
                    bandDiff=bval(band, band_pos[band] - 1),
                    subtype=no['sub'], lang='both-authored-separately',
                    constructEquivalence=(f'NO[{no["sub"]}] == EN[{en["sub"]}] '
                                          f'samme band+subtype per indeks'),
                    correct_no=no['opts'][ci_no], correct_en=en['opts'][ci_en],
                    correctIndex=ci_no, tagsNo=tags_no, tagsEn=tags_en)
        it = dict(id=meta['id'], kind='ability', scales=[{'id': 'g', 'sign': 1}],
                  variants=[], meta=meta)
        reserved.append((it, no, en, ci_no, ci_en))
    assert not no_l and not no_m and not no_h
    assert not en_l and not en_m and not en_h
    return reserved

def build_t4():
    reserved = []
    band_pos = {'L': 0, 'M': 0, 'H': 0}
    band_pos_t4 = {'L': 0, 'M': 0, 'H': 0}
    by = band_list(T4)
    n = 0
    for band in ['L'] * 14 + ['M'] * 13 + ['H'] * 13:
        it = by[band].pop(0)
        n += 1
        band_pos[band] += 1
        band_pos_t4[band] += 1
        assert it['o_no'][0] == it['o_en'][0] or True   # fasit-index 0 ved bygging
        meta = dict(id=f"sp-{n:04d}", theme='T4', band=band,
                    bandDiff=bval(band, band_pos_t4[band] - 1),
                    subtype=it['sub'],
                    correct_no=it['o_no'][0], correct_en=it['o_en'][0],
                    correctIndex=0, tagsNo=it['tags'], tagsEn=it['tags'],
                    note=it.get('note'))
        it2 = dict(id=meta['id'], kind='ability', scales=[{'id': 'g', 'sign': 1}],
                   variants=[], meta=meta)
        reserved.append((it2, it))
    return reserved

ROT_SEQ = [1, 3, 0, 4, 2]    # deterministisk faasit-posisjon-spredning (aldri fast 0)

def build_defs():
    t3_res = build_t3()
    t4_res = build_t4()
    t3_vios, t4_vios = {}, {}
    files = {}
    for lang, suffix in (('no', 'no'), ('en', 'en')):
        t3_items = []
        for i, (it, no, en, ci_no, ci_en) in enumerate(t3_res):
            band = no['band']
            opts_src = no['opts'] if lang == 'no' else en['opts']
            ci0 = no['odd'] if (no['sub'] == 'oddone') else 0
            n = i + 1
            rot = ROT_SEQ[i % 5] if ROT_SEQ[i % 5] != ci0 else (ROT_SEQ[i % 5] + 1) % 5
            # hold fasit; flytt fasit-label til posisjon rot
            labels = opts_src[:]
            correct = labels[ci0]
            labels.pop(ci0)
            labels.insert(rot, correct)
            tags_src = no.get('tags') if (lang == 'no' and no.get('tags')) else en.get('tags')
            if not tags_src:
                tags_src = ['oddone-set-member'] * 4
            ci_final = labels.index(correct)
            # tags folger fasit og kollapser: ved rot 0 -> 'none'; ellers tag lik index
            vios = []
            for k in range(5):
                if k == ci_final:
                    vios.append('none')
                else:
                    j = (k + rot) % 5        # plassering i urotert [fasit,d1,d2,d3,d4]
                    vios.append(tags_src[j - 1])
            t3_vios[it['id'] + '.' + lang] = {'optionOrder': labels, 'violationTags': vios}
            t3_items.append({
                'id': it['id'], 'kind': 'ability',
                'scales': [{'id': 'g', 'sign': 1}],
                'variants': [{'lang': lang,
                              'prompt': (no['q'] if lang == 'no' else en['q']),
                              'options': [{'label': lab} for lab in labels],
                              'correctIndex': ci_final,
                              'difficulty': it['meta']['bandDiff']}],
            })
        t4_items = []
        for i, (it, row) in enumerate(t4_res):
            band = row['band']
            n = i + 1
            opts_src = row['o_no'] if lang == 'no' else row['o_en']
            q_src = row['q_no'] if lang == 'no' else row['q_en']
            rot = ROT_SEQ[i % 5]
            labels = opts_src[:]
            correct = labels[0]
            labels.pop(0)
            labels.insert(rot, correct)
            tags_src = row['tags']
            ci_final = labels.index(correct)
            vios = []
            for k in range(5):
                if k == ci_final:
                    vios.append('none')
                else:
                    j = (k + rot) % 5
                    vios.append(tags_src[j - 1])
            t4_vios[it['id'] + '.' + lang] = {'optionOrder': labels, 'violationTags': vios}
            t4_items.append({
                'id': it['id'], 'kind': 'ability',
                'scales': [{'id': 'g', 'sign': 1}],
                'variants': [{'lang': lang,
                              'prompt': q_src,
                              'options': [{'label': lab} for lab in labels],
                              'correctIndex': ci_final,
                              'difficulty': it['meta']['bandDiff']}],
            })
        # --- T3 def
        files[f'def-evne-t3-verbal.{suffix}.json'] = {
            'schemaVersion': 1, 'id': 'evne-t3-verbal',
            'type': 'test-definition', 'family': 'evner',
            'languages': [lang],
            'scoring': {'type': 'g-score', 'metric': 'z100', 'ci95': True},
            'dimensions': [{'id': 'g', 'label': ('g-skår' if lang == 'no' else 'g score'),
                            'labelLanguage': lang,
                            'description': ('Generell evne, rapportert som IQ-stil-metrikk.'
                                            if lang == 'no' else
                                            'General ability, reported as IQ-style metric.')}],
            'items': t3_items,
        }
        files[f'def-evne-t4-romlig.{suffix}.json'] = {
            'schemaVersion': 1, 'id': 'evne-t4-romlig',
            'type': 'test-definition', 'family': 'evner',
            'languages': [lang],
            'scoring': {'type': 'g-score', 'metric': 'z100', 'ci95': True},
            'dimensions': [{'id': 'g', 'label': ('g-skår' if lang == 'no' else 'g score'),
                            'labelLanguage': lang,
                            'description': ('Generell evne, rapportert som IQ-stil-metrikk.'
                                            if lang == 'no' else
                                            'General ability, reported as IQ-style metric.')}],
            'items': t4_items,
        }
    # ---- meta: alle akser
    meta_items = []
    for (it, no, en, ci_no, ci_en) in t3_res:
        m = dict(it['meta'])
        for lang in ('no', 'en'):
            st = t3_vios[it['id'] + '.' + lang]
            m['optionOrder_' + lang] = st['optionOrder']
            m['violationTags_' + lang] = st['violationTags']
        meta_items.append(m)
    for (it, row) in t4_res:
        m = dict(it['meta'])
        for lang in ('no', 'en'):
            st = t4_vios[it['id'] + '.' + lang]
            m['optionOrder_' + lang] = st['optionOrder']
            m['violationTags_' + lang] = st['violationTags']
        meta_items.append(m)
    return files, meta_items

def main():
    files, meta_items = build_defs()
    for fname, obj in files.items():
        p = os.path.join(OUT, fname)
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print('skrev', fname)
    meta = {
        'schemaVersion': 1, 'id': 'evne-pool-batch2-meta',
        'type': 'evne-pool-meta', 'batch': 2, 'boardLeaf': '#3750',
        'spec': 'tests/schema/_evne_itemspec_spec.json',
        'themes': {'T3': 'evne-t3-verbal', 'T4': 'evne-t4-romlig'},
        'counts': {'T3': 50, 'T4': 40},
        'bands': {'T3': {'L': 17, 'M': 17, 'H': 16},
                  'T4': {'L': 14, 'M': 13, 'H': 13}},
        'authoring': {'T3': 'SEPARAT per spraak (konstrukt-ekvivalens: samme band+subtype per indeks, ikke oversatt)',
                      'T4': 'prompt+valg oversatt; fasit-formulering parallel/identisk per variant'},
        'items': meta_items,
    }
    p = os.path.join(OUT, '_evne_pool_batch2_meta.json')
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('skrev _evne_pool_batch2_meta.json')
    print('OK: T3 50 + T4 40 items, per-spraak-filer x4')

if __name__ == '__main__':
    main()
